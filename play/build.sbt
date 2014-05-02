import play.Project._

libraryDependencies += "net.liftweb" %% "lift-json" % "2.5.1"

libraryDependencies ++= Seq("com.typesafe.slick" %% "slick" % "2.0.1",
                            "com.h2database" % "h2" % "1.4.177")

name := "CMX demo app"

version := "0.1"

playScalaSettings
