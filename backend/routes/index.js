var express = require('express');
var router = express.Router();
const { connectToDB, ObjectId } = require('../utils/db');

/* GET home page. */
router.get('/', async function (req, res) {
  try {
    const db = await connectToDB();
    const events = await db.collection("events").find().toArray();
    const dateValue = value => {
      const timestamp = new Date(value).getTime();
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };
    const mostRecentFirst = (a, b) => {
      const aCreated = a.created_at || (a._id.getTimestamp && a._id.getTimestamp()) || a.date;
      const bCreated = b.created_at || (b._id.getTimestamp && b._id.getTimestamp()) || b.date;
      return dateValue(bCreated) - dateValue(aCreated);
    };
    const now = Date.now();
    const recentEvents = [...events].sort(mostRecentFirst).slice(0, 6);
    const highlightedEvents = events.filter(event =>
      event.isHighlighted === true || event.isHighlighted === 'on' || event.isHighlighted === 'true'
    );
    const upcomingEvents = events
      .filter(event => dateValue(event.date) >= now)
      .sort((a, b) => dateValue(a.date) - dateValue(b.date))
      .slice(0, 6);
    const trendingEvents = [...events];
    for (let i = trendingEvents.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [trendingEvents[i], trendingEvents[randomIndex]] = [trendingEvents[randomIndex], trendingEvents[i]];
    }

    res.render('index', {
      title: 'Homepage',
      highlightedEvents: highlightedEvents,
      recentEvents: recentEvents,
      trendingEvents: trendingEvents.slice(0, 6),
      upcomingEvents: upcomingEvents
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
/* GET events page. */
router.get('/events', async function (req, res) {
  const db = await connectToDB();
  try {
    let results = await db.collection("events").find().toArray();
    const venues = await db.collection("venues").find().toArray();
    const venuesById = new Map(venues.map(venue => [venue._id.toString(), venue]));
    results.forEach(event => {
      if (event.venue && !event.venue.name) {
        event.venue = venuesById.get(event.venue.toString()) || null;
      }
    });
    res.render('events', { events: results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
/* GET venues page. */
router.get('/venues', async function (req, res) {
  const db = await connectToDB();
  try {
    let results = await db.collection("venues").find().toArray();
    res.render('venues', { venues: results });
  } catch (error) {
    res.status(500).json({ message: err.message });
  }
});
/* Handle the Event Form */
router.get('/event/add', async function (req, res) {
  try {
    const db = await connectToDB();
    let venues = await db.collection("venues").find().toArray();
    res.render('eventsAdd', { title: 'Add Event', venues: venues });
  } catch (error) {
    res.status(500).json({ message: err.message });
  }
});
router.post('/event', async function (req, res) {
  const db = await connectToDB();
  try {
    req.body.title = req.body.title.trim();
    req.body.speaker = req.body.speaker.trim();
    req.body.date = req.body.date.trim();
    req.body.created_at = new Date();
    let result = await db.collection("events").insertOne(req.body);
    res.redirect('/events');
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* Display a single Event */
router.get('/event/detail/:id', async function (req, res) {
  const db = await connectToDB();
  try {
    let result = await db.collection("events").findOne({ _id: new ObjectId(req.params.id) });
    if (result) {
      const venueId = result.venue;
      const venue = venueId && ObjectId.isValid(venueId.toString())
        ? await db.collection("venues").findOne({ _id: new ObjectId(venueId) })
        : null;
      res.render('eventDetail', { event: result, venue: venue });
    } else {
      res.status(404).json({ message: "Event not found" });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
/* Display a update form for a single Event */
router.get('/event/edit/:id', async function (req, res, next) {
  const db = await connectToDB();
  try {
    const { id } = req.params;
    const event = await db.collection("events").findOne({ _id: new ObjectId(id) });
    const venues = await db.collection("venues").find().toArray();
    const venueId = event && event.venue && (event.venue._id || event.venue).toString();
    const currentVenue = venueId && ObjectId.isValid(venueId)
      ? await db.collection("venues").findOne({ _id: new ObjectId(venueId) })
      : null;
    res.render('eventUpdate', { event: event, venues: venues, currentVenue: currentVenue });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* Update a single Event */
router.post('/event/:id', async function (req, res) {
  const db = await connectToDB();
  try {
    req.body.title = req.body.title.trim();
    req.body.speaker = req.body.speaker.trim();
    req.body.modified_at = new Date();

    let result = await db.collection("events").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    if (result.modifiedCount === 0) {
      res.status(404).json({ message: "Event not found" });
    } else {
      res.redirect('/events')
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* Handle Venue Form */
router.get('/venue/add', function (req, res) {
  res.render('venuesAdd', { title: 'Add Venue' });
});
router.post('/venue', async function (req, res, next) {
  const db = await connectToDB();
  try {
    req.body.name = req.body.name.trim();
    req.body.location = req.body.location.trim();
    req.body.created_at = new Date();
    await db.collection("venues").insertOne(req.body);
    res.redirect('/venues');
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* Display a update form for a single Venue */
router.get('/venue/edit/:id', async function (req, res) {
  const db = await connectToDB();
  try {
    const { id } = req.params;
    const venue = await db.collection("venues").findOne({ _id: new ObjectId(id) });
    res.render('venueUpdate', { venue: venue });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* Update a single Venue */
router.post('/venue/:id', async function (req, res) {
  const db = await connectToDB();
  try {
    req.body.name = req.body.name.trim();
    req.body.location = req.body.location.trim();
    req.body.modified_at = new Date();

    let result = await db.collection("venues").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );

    if (result.modifiedCount === 0) {
      res.status(404).json({ message: "Venue not found" });
    } else {
      res.redirect('/venues');
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }

});

/* Delete a single Venue */
router.post('/venue/delete/:id', async function (req, res) {
  const db = await connectToDB();
  try {
    let result = await db.collection("venues").deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount > 0) {
      res.redirect('/venues');
    } else {
      res.status(404).json({ message: "Venue not found" });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/*Delete a single Event*/
router.post('/event/delete/:id', async function (req, res) {
  const db = await connectToDB();
  try {
    let result = await db.collection("events").deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount > 0) {
      res.redirect('/events');
    } else {
      res.status(404).json({ message: "Event not found" });
    }
  } catch {
    res.status(400).json({ message: err.message });
  }
});



module.exports = router;