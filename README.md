# Cisco Meraki CMX API demo app

This application show you how to get started using the [Cisco Meraki](https://meraki.cisco.com/) CMX API. CMX (Connected Mobile Experiences) is Cisco’s location analytics and engagement platform, and it’s integrated into Cisco Meraki wireless products. To learn more about what you can do with CMX, see the [Cisco Meraki CMX site](https://meraki.cisco.com/solutions/cmx).

## Table of contents

- [Installation and Requirements](#installation-and-requirements)
- [Running the app](#running-the-app)
- [Copyright and license](#copyright-and-license)


## Installation and Requirements


### Installation

- Create a new directory for this project.
- Clone the repo into this directory by running `git clone git@github.com:meraki/cmx-api-app.git` (this will clone the project into the subdirectory `cmx-api-app`).
- Alternatively, [download the ZIP file](https://github.com/meraki/cmx-api-app/archive/master.zip) and unzip it into your project directory.

### Software requirements:

- Ensure you have Ruby 1.9 installed. If you don’t, consider using [RVM](https://rvm.io) to install and manage your Ruby versions.
- Ensure that you have the sinatra gem installed; if you don’t, do `gem install sinatra` via the command line in your project directory.
- Ensure that you have the data_mapper gem installed; if you don’t, do `gem install data_mapper` via the command line in your project directory.
- Ensure you have the sqlite adapter installed; if you don’t, do `gem install dm-sqlite-adapter` via the command line in your project directory.
     
### Network infrastructure requirements:

- The app requires using one or more [Cisco Meraki MR wireless access points](https://meraki.cisco.com/products/wireless) (APs).
- A valid Enterprise license is required for each Meraki AP.
- Note: this app does not work with other Cisco APs or non-Cisco APs.



## Running the app
Let’s say you plan to run this app on a server you control called pushapi.myserver.com.

1. Go to the Cisco Meraki dashboard and configure the CMX Location Push API (find it under Organization > Settings) with the url `http://pushapi.myserver.com:4567/events`
2. Choose a secret and enter it into the dashboard
3. Make note of the validation code that dashboard provides.
4. Pass the secret and validation code to this server when you start it:

	```sample_location_server.rb <secret> <validator>```
5. You can change the bind interface (default: 0.0.0.0) and port (default: 4567)
using Sinatra's -o and -p option flags:

	```sample_location_server.rb -o <interface> -p <port> <secret> <validator>```
6. Click the “Validate server” button in CMX Location Push API configuration in
the dashboard. Meraki cloud servers will perform a GET to your server, and you will
see a log message like this:

	```[26/Mar/2014 11:52:09] "GET /events HTTP/1.1" 200 6 0.0024```

	If you do not see such a log message, check your firewall and make sure
you’re allowing connections to port 4567. You can confirm that the server
is receiving connections on the port using

  ```telnet pushapi.myserver.com 4567```

7. Once the Meraki cloud has confirmed that the URL you provided returns the expected
validation code, it will begin posting events to your URL. For example, when
a client probes one of your access points, you’ll see a log message like
this:

	```[2014-03-26T11:51:57.920806 #25266]  INFO -- : client aa:bb:cc:dd:ee:ff seen on ap 11:22:33:44:55:66 with rssi 24 on Tue Mar 26 11:50:31.836 UTC 2014 at (37.703678, -122.45089)```

8. After your first client pushes start arriving (this may take a minute or two),
you can get a JSON blob describing the last client probe using:

	```pushapi.myserver.com:4567/clients/{mac}```

where {mac} is the client mac address. For example,
	
	```http://pushapi.myserver.com:4567/clients/34:23:ba:a6:75:70```

may return
	
	```{"id":65,"mac":"34:23:ba:a6:75:70","seenAt":"Fri Apr 18 00:01:41.479 UTC 2014","lat":37.77059042088197,"lng":-122.38703445525945}```

You can also view the sample frontend at ```http://pushapi.myserver.com:4567/```

Try connecting your mobile device to your network, and entering your mobile device‘s WiFi MAC in the frontend.

## Copyright and license

Code and documentation copyright 2013-2014 Cisco Systems, Inc. Code released under [the MIT license](LICENSE). Documentation released under [Creative Commons](DOCS-LICENSE).
