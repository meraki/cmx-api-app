package controllers

import net.liftweb.json.{parse => lift, DefaultFormats, Serialization}
import play.api.Play.current
import play.api.Logger
import play.api.mvc._
import play.api.data.Form
import play.api.data.Forms._
import scala.slick.driver.H2Driver.simple._
import play.Configuration

import scala.util.Try

case class EventsForm(data: String)
object EventsForm {
  val form = Form( mapping("data" -> text)(EventsForm.apply)(EventsForm.unapply) )
}

// Parses events json
case class Events(secret: String, data: Seq[Probe], version: String)
case class Location(lat: Double, lng: Double, unc: Double)
case class Probe(clientMac: String, apMac: String, isAssociated: Boolean,
    rssi: Int, seenTime: String, seenEpoch: Long,
    location: Option[Location], manufacturer: Option[String], os: Option[String]) {
  def toStoredProbe = (clientMac, seenTime, seenEpoch,
      location.map(_.lat), location.map(_.lng),
      location.map(_.unc), manufacturer, os)
}

// Frontend JSON
case class Client(mac: String, seenString: String, seenMillis: Long,
    lat: Option[Double], lng: Option[Double], unc: Option[Double],
    manufacturer: Option[String], os: Option[String]) {
  def toJson =
      "{\"mac\":\"" + mac +
      "\",\"seenString\":\"" + seenString +
      "\",\"seenMillis\":" + seenMillis +
      lat.map(",\"lat\":" + _).getOrElse("") +
      lng.map(",\"lng\":" + _).getOrElse("") +
      unc.map(",\"unc\":" + _).getOrElse("") +
      manufacturer.map(",\"manufacturer\":\"" + _ + "\"").getOrElse("") +
      os.map(",\"os\":\"" + _ + "\"").getOrElse("") +
      "}"
}

// DB representation of probes
class StoredProbes(tag: Tag)
extends Table[(String, String, Long,
    Option[Double], Option[Double], Option[Double], Option[String], Option[String])](tag, "probes") {
  def mac = column[String]("mac", O.PrimaryKey)
  def probeTime = column[String]("seenTime")
  def probeEpoch = column[Long]("seenEpoch", O.Default(0L))
  def lat = column[Option[Double]]("lat", O.Nullable)
  def lng = column[Option[Double]]("lng", O.Nullable)
  def unc = column[Option[Double]]("unc", O.Nullable)
  def manufacturer = column[Option[String]]("manufacturer", O.Nullable)
  def os = column[Option[String]]("os", O.Nullable)
  def * = (mac, probeTime, probeEpoch, lat, lng, unc, manufacturer, os)
}

object Application extends Controller {
  implicit val formats = DefaultFormats

  val logger = Logger("application")

  val db = Database.forURL("jdbc:h2:/tmp/test1,DB_CLOSE_DELAY=-1", driver="org.h2.Driver")
  val storedProbes = TableQuery[StoredProbes]
  lazy val init = db.withSession { implicit session =>
    storedProbes.ddl.drop
    storedProbes.ddl.create
  }

  val validator = current.configuration.getString("app.validator").get
  val secret = current.configuration.getString("app.secret")

  logger.info("Booted successfully")

  def echo(content: String) = Action { implicit request =>
    logger.info(s"Echoing '${content}'")
    Ok(content)
  }

  def validate = Action {
    Ok(validator)
  }

  def receiveEventsHelper[T] (implicit request: Request[String]): Result = {
    // Parse the probe events
//    var json = request.body.asJson.orElse {
//      val form = EventsForm.form.bindFromRequest
//      Option(Json.parse(form.get.data))
//    }.get
    val json = try { lift(request.body) }
    catch {
      case ex: Exception =>
        logger.warn("Received unparseable data: " + request.body.take(200))
        return BadRequest
    }

    val version = (json \ "version").extractOpt[String]
    if (version != Some("2.0")) {
      logger.warn(s"Received bad API version $version")
      if (!version.isEmpty) logger.warn("OLD VERSION: " + Serialization.write(json \ "probing").take(200))
      return BadRequest
    }
//    else {
//      logger.info(net.liftweb.json.Serialization.write(json).take(100))
//    }
    logger.info(Serialization.write(json \ "data").take(200))
    if ((json \ "secret").extractOpt[String] != secret) {
      logger.warn(s"Received request with bad secret")
      return Forbidden
    }

    val probes = (json \ "data").extractOpt[List[Probe]]
    logger.info(s"Received ${probes.get.size} clients")
    probes.foreach(p => logger.debug("Received " + p))
    db.withSession { implicit session =>
      probes.get.foreach { p =>
        val retrieved = for {
          s <- storedProbes if s.mac === p.clientMac
        } yield s
        retrieved.list.headOption.map(Client.tupled(_)) match {
          case None =>
            Try { storedProbes += p.toStoredProbe }
          case Some(c) if c.seenMillis < p.seenEpoch =>
            retrieved.update(p.toStoredProbe)
          case _ =>
        }
      }
    }

    Ok("")
  }

  def receiveEvents = Action(parse.tolerantText) { implicit request =>
    init
    receiveEventsHelper(request)
  }

  def getClient(mac: String) = Action {
    db.withSession { implicit session =>
      val stored = for (p <- storedProbes if p.mac === mac) yield p
      val client = stored.list.headOption.map(Client.tupled(_))
      Ok(client.map(_.toJson).mkString("[",",","]"))
    }
  }

  def benchmark[T](f: => T): (T, Double) = {
    val start = System.nanoTime
    val result = f
    (result, (System.nanoTime - start).toDouble/1e6)
  }

  def getAllClients = Action {
    val (rows, retrievalTime) = benchmark {
      db.withSession { implicit session =>
        val stored = for (p <- storedProbes) yield p
        stored.list
      }
    }
    val (clients, conversionTime) = benchmark { rows.map(Client.tupled(_)) }
    val filtered = clients.filterNot(cl => cl.lat.isEmpty || cl.lng.isEmpty || cl.unc.isEmpty)
//    val (json, serializationTime) = benchmark { net.liftweb.json.Serialization.write(clients) }
    val (json, serializationTime) = benchmark {
      clients.map{_.toJson}.mkString("[",",","]")
    }
    logger.info(s"Returning all clients: Retrieval ${retrievalTime} ms; Conversion ${conversionTime} ms; Serialization ${serializationTime} ms")
    Ok(json)
  }
}