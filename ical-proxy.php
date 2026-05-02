<?php
// Proxies Airbnb iCal to bypass CORS. Deploy this file to Network Solutions root.
$url = 'https://www.airbnb.com/calendar/ical/925287223019649070.ics?t=277cee5b52cd48ef964f3070bebae421&locale=en';

header('Content-Type: text/calendar; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=3600');
readfile($url);
