export default async function handler(req, res) {
  const icalUrl = process.env.VRBO_ICAL_URL;

  if (!icalUrl) {
    res.status(500).send('VRBO_ICAL_URL not configured');
    return;
  }

  try {
    const response = await fetch(icalUrl);
    if (!response.ok) {
      res.status(502).send('Failed to fetch VRBO calendar');
      return;
    }
    const text = await response.text();
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).send('Error fetching VRBO calendar: ' + err.message);
  }
}
