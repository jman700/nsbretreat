// chatbot.js — Local Knowledge Base Chatbot

const KB = [
  { q: ['wifi','internet','password','network','connection'],
    a: 'The WiFi network and password are on the <a href="#quick">Quick Info</a> cards at the top — tap to copy!' },
  { q: ['checkout','check out','check-out','leave','leaving','departure'],
    a: 'Check-out is at 10:00 AM. See the <a href="#checkout">Checkout section</a> for everything to do before you go.' },
  { q: ['checkin','check in','check-in','arrive','arrival','when can'],
    a: 'Check-in is at 4:00 PM. The door code is on the <a href="#quick">Quick Info</a> card. See <a href="#house">The House → Door Lock &amp; Entry</a> for lock instructions.' },
  { q: ['park','parking','street','driveway','car','vehicle','where to park'],
    a: 'Park in the right garage spot, driveway, or front yard grass. Street parking is prohibited. Watch for the water meter sticking out of the ground. See <a href="#house">The House → Parking</a> for full details.' },
  { q: ['lock','unlock','door','smart lock','entry','code','key','locked out','access'],
    a: 'Black smart lock on the front door — no physical key needed. To unlock: press the house icon (bottom left), enter your code. To lock: press the lock icon (bottom right). Code is on the <a href="#quick">Quick Info</a> cards.' },
  { q: ['pool','swim','swimming'],
    a: 'The private pool is in the backyard. The pool light is controlled from the kitchen tablet — Equipment tab → Pool Light. See <a href="#hottub">Hot Tub</a> for full instructions.' },
  { q: ['pergola','outdoor kitchen','bar seating','hammock','outdoor bar','mini fridge','outdoor light','backyard','patio','outside'],
    a: 'The backyard has it all: pool &amp; hot tub, covered pergola with outdoor kitchen and bar seating for 9, a separate bar area with sink and mini fridge, a hammock, and putting green (temporarily in the garage). Both front and back yards have gorgeous ambient lighting for evenings. See <a href="#house">The House → Outdoor Spaces</a>.' },
  { q: ['hot tub','jacuzzi','spa','tub','jets','bubbles','blower','heat'],
    a: 'The hot tub is controlled by the tablet on the kitchen wall. Touch screen → slide up to unlock → "815 NSB Pool System" → OneTouch Scenes → Spa Mode. Takes ~30 min to reach 102°F. See <a href="#hottub">Hot Tub section</a> for full step-by-step.' },
  { q: ['tablet','ipad','control','pool system','app','815'],
    a: 'The pool/spa tablet is mounted on the kitchen wall. Touch to wake, slide up to unlock, tap "815 NSB Pool System." OneTouch Scenes → Spa Mode for heating. Equipment tab for bubbles and lights. See <a href="#hottub">Hot Tub section</a>.' },
  { q: ['pool alarm','sliding door','child','safety','alarm','door alarm'],
    a: 'The sliding door to the pool has a child safety alarm (grey box on the left). To exit: press mute button first. To re-enter: press the small button on the outside frame. Mute lasts 10–15 seconds. Adults-only groups may disable it. See <a href="#hottub">Hot Tub → Pool Sliding Door Alarm</a>.' },
  { q: ['beach','ocean','surf','wave','sand','water'],
    a: 'The beach is about a 3-minute walk. Beach gear is in the garage. Check <a href="#beach">Beach Tips</a> for everything you need to know, and <a href="#conditions">Current Beach Conditions</a> for live weather, water temp, wind, and wave data.' },
  { q: ['conditions','weather','wind','wave','water temp','uv','forecast','flag','beach flag','beach conditions'],
    a: 'Live beach conditions are on the <a href="#conditions">Current Beach Conditions</a> card — air temp, water temp, wind speed, wave height, and UV index updated in real time. Also links to the official Volusia County beach flag status and the live NSB beach cam.' },
  { q: ['bike','bicycle','cruiser','cycle','ride'],
    a: 'Beach cruiser bikes are in the garage. Lock code: 81518. See <a href="#around">Getting Around</a> for more.' },
  { q: ['margaritaville','frozen','cocktail','blender','drinks'],
    a: 'The Margaritaville maker is in the kitchen! Add ice to the top reservoir, your mixer to the blending jar, and press blend. Enjoy!' },
  { q: ['coffee','espresso','nespresso','brew','cappuccino','latte','keurig','french press','moka','folgers','pod','accessories'],
    a: 'Coffee accessories are at the <strong>bar area left of the fridge</strong>, with some extra pods/supplies in the pantry. We have a drip maker, French press, Bialetti Moka Express, super-automatic espresso machine (whole bean only), Nespresso Original, and Keurig. See <a href="#house">The House → Espresso &amp; Coffee</a>.' },
  { q: ['grill','bbq','barbecue','gas','cook outside','propane'],
    a: 'The grill runs on the home\'s natural gas line (no propane tank). Twist the mechanical gas timer to the left of the grill to start gas flow; check the shut-off knob under the grill is in-line with the hose. Timer auto-shuts off — twist again if grilling longer. Turn it off when done. <strong>Grilling supplies</strong> are in kitchen drawers and the cabinet under the grill. See <a href="#house">The House → Grill</a>.' },
  { q: ['spice','spices','pantry','cooking','supplies','ingredients'],
    a: 'We provide a variety of spices and basic cooking items — check the pantry before purchasing extras. See <a href="#house">The House → Kitchen Appliances</a>.' },
  { q: ['ice','ice maker','cooler'],
    a: 'The fridge has an ice maker for normal family use. Large groups may want to grab extra bags of ice for coolers. See <a href="#house">The House → Kitchen Appliances</a>.' },
  { q: ['towel','beach towel','pool towel','where are towels','linen'],
    a: 'Beach and pool towels are in the <strong>second-floor double-door closet near the game room</strong>. Please wash pool towels separately from white linens.' },
  { q: ['trash','garbage','bin','waste','rubbish','pickup','collection day'],
    a: 'Trash bins are in the pull-out drawer to the left of the pantry. Extra bags are under the kitchen sink. Trash pickup is <strong>Monday &amp; Thursday mornings</strong> — roll bins to the curb by 7 AM.' },
  { q: ['laundry','washer','dryer','wash','clothes'],
    a: 'Two full sets of washers and dryers are in the laundry room. Detergent is provided. Wash pool towels separately from white linens. See <a href="#house">The House → Laundry</a>.' },
  { q: ['tv','television','netflix','hulu','streaming','channel','remote'],
    a: 'Every room has a Smart TV with Netflix, Hulu, YouTube TV, and more. Sign in with your own account and please sign out before checkout.' },
  { q: ['game','arcade','air hockey','gaming','room upstairs'],
    a: 'The game room is upstairs with retro arcade games and an air hockey table. If anything has power issues, check the plug at the back. See <a href="#house">The House → Game Room</a>.' },
  { q: ['massage','chair','relax','zero gravity'],
    a: 'The zero-gravity massage chair is in the <strong>first floor master bedroom</strong>. Everything including reclining is controlled by the remote attached to the chair — select a program and enjoy. See <a href="#house">The House → Massage Chair</a>.' },
  { q: ['contact','host','antonio','yani','help','problem','issue','emergency'],
    a: 'For any questions or urgent issues, call or text Antonio directly: <a href="tel:4075066654">(407) 506-6654</a>' },
  { q: ['golf','putting','green','putt'],
    a: 'There\'s a putting green temporarily located in the garage. Putters are available — enjoy!' },
  { q: ['detwiler','tennis','pickleball','basketball','court','playground','park'],
    a: 'Detwiler Park is right at the end of our street — free tennis, pickleball, basketball courts, playground, and night lighting. We provide paddles, rackets, and balls in the garage. See <a href="#around">Getting Around</a>.' },
  { q: ['kids','children','baby','toddler','infant','stroller','high chair','pack and play','crib'],
    a: 'We have plenty for the little ones: Pack &amp; Play, high chair, stroller, baby bath tub, silicone utensils, step stools, and pool/beach toys. See <a href="#house">The House → Kids Amenities</a>.' },
  { q: ['fire','fire feature','firepit','fire pit'],
    a: 'The fire feature by the hot tub is not available for guest use. Everything else in the home is yours to enjoy!' },
  { q: ['golf cart','scooter','electric scooter','cart'],
    a: 'Our personal golf cart and electric scooter are not available for guest use. For a golf cart rental, Salty Rentals is walking distance — call 386-410-5558. See <a href="#around">Getting Around</a>.' },
  { q: ['garage','goodies','sports','equipment','sports equipment'],
    a: 'The garage is stocked with beach cruiser bikes (lock code 81518), utility carts, coolers, beach chairs, toys, games, and sporting equipment including tennis/pickleball paddles and rackets for Detwiler Park. See <a href="#house">The House → Garage Goodies</a>.' },
  { q: ['inspect','damage','arrival','check damage','upon arrival'],
    a: 'Please inspect the home when you arrive and let us know right away if anything needs attention. Document any existing damage with photos and send via text or through the booking app.' },
  { q: ['restaurant','eat','food','dinner','lunch','breakfast','dining'],
    a: 'Check the <a href="#local">Local Guide</a> — filter by "Eat"! We love The Breakers (beachfront burgers), The Garlic (Italian), Outriggers (tiki bar), and The Spott (upscale).' },
  { q: ['bar','drink','cocktail','beer','wine','happy hour','brewery'],
    a: 'Filter the <a href="#local">Local Guide</a> to "Drink"! Flagler Tavern, Outriggers Tiki Bar, and New Smyrna Brewing Co. are all great picks.' },
  { q: ['coffee shop','cafe'],
    a: 'Filter the <a href="#local">Local Guide</a> to "Coffee" — Java Joint and Brew-Ha Ha are favorites.' },
  { q: ['flagler','shopping','shops','store','avenue','downtown beach'],
    a: 'Flagler Avenue is the heart of NSB — shops, restaurants, festivals, beach access. See <a href="#local">Local Guide → See</a>.' },
  { q: ['dunes','smyrna dunes','nature','hike','trail','boardwalk','wildlife'],
    a: 'Smyrna Dunes Park is 184 acres of boardwalk trails, wildlife, and Ponce Inlet views. See <a href="#local">Local Guide → Do</a>.' },
  { q: ['canal','historic','gallery','art','causeway','bridge'],
    a: 'Canal Street Historic District is across the causeway — art galleries, local eateries, and charming architecture. See <a href="#local">Local Guide → See</a>.' },
  { q: ['salty','rental','rent','golf cart rental'],
    a: 'Golf cart rentals: Salty Rentals is walking distance from the house. Call 386-410-5558. See <a href="#around">Getting Around</a>.' },
  { q: ['surf','surfing','lesson','kayak','paddleboard','sup'],
    a: 'NSB is one of Florida\'s best surf spots. Surf lessons and kayak/paddleboard rentals are in the <a href="#local">Local Guide → Do</a>.' },
  { q: ['turtle','sea turtle','nest','nesting','egg'],
    a: 'NSB is a sea turtle nesting area. Don\'t disturb nests or use bright lights near the beach after dark. More tips in <a href="#beach">Beach Tips</a>.' },
  { q: ['dog','pet','animal','bring','allowed'],
    a: 'Pets are <strong>not allowed on the beach</strong>, with the exception of service animals. Dog-friendly beach areas do exist, such as parts of Smyrna Dunes Park. See <a href="#beach">Beach Rules &amp; Tips</a>.' },
  { q: ['event','events','weekly','monthly','farmers market','wine walk','canal nights','classic cars','sip stroll','norwoods'],
    a: 'NSB has great recurring events! Farmers markets (Saturday mornings), Canal Street Nights (every 3rd Thursday), Classic Cars on Canal (2nd Saturday monthly), Wine Walk on Flagler Ave (last Saturday monthly), and the 1st Saturday Sip &amp; Stroll. See <a href="#events">Weekly &amp; Monthly Events</a> for full schedules and locations.' },
  { q: ['host','about','antonio','yani','who are','brothers','owners'],
    a: 'Antonio and Yani are brothers from Orlando who fell in love with New Smyrna Beach and made it their second home. They run a family motorcoach transportation business in Florida. See <a href="#hosts">Meet Your Hosts</a> to learn more.' },
  { q: ['ac','air condition','heat','cool','thermostat','temperature','cold'],
    a: 'Adjust the thermostat to your preferred temp. Keep windows and doors closed — the AC shuts off if left open. See <a href="#house">The House → Heating &amp; Cooling</a>.' },
  { q: ['toilet','flush','plumb','clog','sink','drain'],
    a: 'Please only flush toilet paper — no wipes or feminine products even if labeled flushable. For plumbing issues, contact Antonio immediately. See <a href="#house">The House → Water &amp; Plumbing</a>.' },
  { q: ['clean','cleaning','mop','broom','vacuum','sweep'],
    a: 'Cleaning tools (brooms, mops, vacuum) are in the laundry room or garage. Supplies are under the kitchen sink. See <a href="#house">The House → Cleaning Supplies</a>.' },
  { q: ['first aid','bandage','medicine','medical kit','aid kit'],
    a: 'The first aid kit is <strong>under the kitchen sink</strong>.' },
  { q: ['circuit breaker','breaker','power out','no power','electricity','fuse','fuse box'],
    a: 'The circuit breaker is in the <strong>garage on the left wall</strong>. If you lose power to part of the home, check there first. For bigger issues, call Antonio: <a href="tel:4075066654">(407) 506-6654</a>.' },
  { q: ['water main','water shut','main valve','flood','leak','burst','plumbing shut'],
    a: 'The water main shutoff is on the <strong>right side of the home</strong> — look for the lever near the corner of the porch in the grass by the palm tree. For any leak or plumbing emergency, call Antonio immediately: <a href="tel:4075066654">(407) 506-6654</a>.' },
  { q: ['smoke','smoking','cigarette','vape','vaping','cigar'],
    a: 'We ask that guests not smoke anywhere on the property. If you need to smoke, please step off the property and dispose of cigarette butts responsibly. See <a href="#house">House Rules</a>.' },
  { q: ['uber','lyft','taxi','ride','transport'],
    a: 'Uber and Lyft are available in NSB. For a fun local option, Salty Rentals does golf cart rentals (386-410-5558). See <a href="#around">Getting Around</a>.' },
  { q: ['address','location','where','directions','navigate'],
    a: 'The address is <strong>815 Carol Avenue, New Smyrna Beach, FL 32169</strong>.' },

  // ── NSB History ──────────────────────────────────────────────────────────
  { q: ['history','timucua','colonial','turnbull','minorcan','minorca','spanish','native american','founded'],
    a: 'NSB has fascinating history! The Timucua people lived here for centuries. In 1768, Dr. Andrew Turnbull founded a colony called "New Smyrna" — the largest British colonial settlement in North America — with ~1,400 Minorcan, Greek, and Italian settlers. Hardships were severe; most didn\'t survive. Their descendants (surnames Acosta, Pellicer, Manucy) still live in St. Augustine. See the <strong>Sugar Mill Ruins</strong> (Old Mission Rd, free) and <strong>New Smyrna Museum of History</strong>, 120 Sams Ave — (386) 478-0052.' },

  { q: ['turtle mound','shell mound','timucua mound','midden'],
    a: '<strong>Turtle Mound</strong> is the largest shell midden on the US mainland — built by the Timucua people over ~1,200 years. It\'s inside Canaveral National Seashore at 7611 S Atlantic Ave (~3 miles south of NSB). The seashore has 24 miles of undeveloped beach. Vehicle entry: $25 (7-day pass). Worth a visit!' },

  { q: ['sugar mill','sugar mill ruins','old fort','old fort park','plantation ruins','coquina'],
    a: 'The <strong>Sugar Mill Ruins</strong> are coquina walls of an 1830s steam sugar mill — free, open daily on Old Mission Rd (~1 mile west of the Intracoastal). <strong>Old Fort Park</strong> is downtown near Sams Ave. The <strong>New Smyrna Museum of History</strong> is at 120 Sams Ave, (386) 478-0052 — covers Timucua, Turnbull colony, Civil War, and 20th-century development.' },

  // ── Medical ───────────────────────────────────────────────────────────────
  { q: ['hospital','er','emergency room','ambulance','medical emergency','doctor','urgent care','clinic','sick','injured','hurt','pharmacy','walgreens','cvs','minute clinic'],
    a: '<strong>Hospital/ER:</strong> AdventHealth NSB, 401 Palmetto St — <a href="tel:3864245000">(386) 424-5000</a>, 24-hour ER.<br><strong>Urgent Care:</strong> PrimeCare, 1327 Saxon Dr — <a href="tel:3867672402">(386) 767-2402</a> (Mon–Fri 8–6, Sat–Sun 9–3). NSB Urgent Care Walk-In: <a href="tel:3866633061">(386) 663-3061</a>, 7 days.<br><strong>Pharmacies:</strong> Walgreens 800 A1A; CVS (multiple locations); Publix Pharmacy 709 E 3rd Ave.' },

  // ── Grocery ───────────────────────────────────────────────────────────────
  { q: ['grocery','supermarket','publix','walmart','winn-dixie','winn dixie','food store','target','shopping for food','buy groceries'],
    a: '<strong>Closest to the house:</strong> Publix at 709 E 3rd Ave (beachside, daily 7 AM–10 PM). Winn-Dixie at 1835 FL-44 (daily 7 AM–10 PM). Walmart Supercenter at 3155 SR 44 on the mainland (daily 6 AM–11 PM). No Target in NSB — nearest is ~20 min north in Port Orange.' },

  // ── Specific Restaurants ──────────────────────────────────────────────────
  { q: ['jb\'s','jbs','fish camp','pompano ave','shrimp basket','grouper sandwich','fried shrimp'],
    a: '<strong>JB\'s Fish Camp</strong> (859 Pompano Ave) is an NSB institution since the 1970s — classic fish camp on the Indian River. No reservations. Fried shrimp, fresh grouper, fish tacos, oysters. Also kayak rentals nearby for manatee viewing. Hours: Mon–Sat 11–9, Sun 11–8. Arrive early on weekends. <a href="tel:3864275747">(386) 427-5747</a>' },

  { q: ['grille at riverview','riverview restaurant','101 flagler','riverview','waterfront restaurant','intracoastal dining'],
    a: '<strong>The Grille at Riverview</strong> (101 Flagler Ave) sits on the Indian River/Intracoastal — dolphin watching from the Key West Deck, award-winning food (fresh seafood, steaks), Sunday brunch. Mon–Thu 11:30–9, Fri–Sat 11:30–10, Sun 10:30–9. Reservations recommended. <a href="tel:3864281865">(386) 428-1865</a>' },

  { q: ['norwoods','norwood\'s','treehouse bar','treehouse restaurant'],
    a: '<strong>Norwood\'s Eatery &amp; Treehouse Bar</strong> (400 2nd Ave E) dates back to 1946. The upstairs "Treehouse" bar is legendary. Good for families; weekend brunch Sat–Sun from 10 AM. Mon–Thu 4–10, Fri 4 PM–midnight, Sat 10 AM–midnight, Sun 10 AM–10 PM.' },

  { q: ['wake up cafe','wake up','cafe con leche','alfajores','argentine breakfast','cuban sandwich breakfast'],
    a: '<strong>Wake Up Cafe</strong> (749 E 3rd Ave) is a local favorite — Argentine and American breakfast/brunch including cafe con leche, Alfajores Pancakes, omelets, and Cuban sandwiches. Daily 7 AM–2 PM. Expect a wait on weekends. <a href="tel:3864104719">(386) 410-4719</a>' },

  { q: ['chase\'s','chases on the beach','chases','beach music venue','beach live music'],
    a: '<strong>Chase\'s on the Beach</strong> (3401 S Atlantic Ave) is a live music venue right on the sand with beach volleyball. Weekend brunch Sat–Sun 10 AM–2:30 PM. Mon–Fri 11–9, Sat–Sun 10–9. <a href="tel:3862208575">(386) 220-8575</a>' },

  { q: ['third wave','third wave cafe','wine cafe','south atlantic cafe'],
    a: '<strong>Third Wave Cafe &amp; Wine Bar</strong> (4154 S Atlantic Ave, south of Flagler) serves gourmet coffee and sandwiches by day; global wines and craft beer by evening. More local/less touristy — a good spot to escape the Flagler crowds.' },

  { q: ['canal street restaurant','canal street dining','city market','corkscrew','general public','the spott','spott canal'],
    a: 'Canal Street (mainland, ~15 min drive) has great dining: City Market Bistro (124 Canal) for shrimp &amp; grits; Corkscrew Bar &amp; Grille (235 Canal) for happy hour; The General Public House (501 Canal) for chicken &amp; waffles; The Spott (424 Canal) for upscale grouper and truffle fries.' },

  { q: ['caffe vesuvio','vesuvio','neapolitan pizza','artisan italian'],
    a: '<strong>Caffe Vesuvio</strong> (701 E 3rd Ave) is an artisan Italian kitchen with Neapolitan-style pizza, lobster ravioli, carbonara, and tiramisu. Daily 11 AM–10 PM. <a href="tel:3864443510">(386) 444-3510</a>' },

  { q: ['sonapa','so napa','sonapa grille','napa wine dinner','california cuisine nsb'],
    a: '<strong>SoNapa Grille</strong> (3406 S Atlantic Ave) is a wine-focused restaurant with a Napa/Sonoma vibe — Northern California cuisine in a winery atmosphere. Mon–Thu 4:30–10, Fri–Sat 4:30–11, closed Sun. <a href="tel:3864028647">(386) 402-8647</a>' },

  { q: ['avanu','rooftop restaurant','rooftop dining','polynesian nsb','rooftop bar nsb'],
    a: '<strong>Avanu on Flagler</strong> is Polynesian-inspired with fresh local seafood and one of NSB\'s only rooftop dining spots — panoramic views. Reservations recommended for the rooftop.' },

  { q: ['black butterfly','scratch kitchen','all day brunch nsb','sr 44 restaurant'],
    a: '<strong>Black Butterfly NSB</strong> (1859 SR 44, mainland side) is a scratch kitchen for all-day brunch; evenings are reservation-only fine dining with handcrafted dishes and house-made pastries. <a href="tel:3864788998">(386) 478-8998</a>' },

  // ── Bars & Nightlife ──────────────────────────────────────────────────────
  { q: ['crimson house','crimson','wine bar nsb','jazz cocktail bar','couples bar'],
    a: '<strong>Crimson House</strong> (just off Flagler Ave) is a chic wine bar — curated wines, craft cocktails, live acoustic or jazz performances. Great for couples or small groups looking for a quieter evening.' },

  { q: ['flagler tavern late night','flagler tavern bar','nightlife nsb','late night nsb','nightclub nsb','rooftop bar'],
    a: '<strong>Flagler Tavern</strong> (414 Flagler Ave) is NSB\'s main nightlife hub — multi-level with a rooftop bar and ocean views. Live bands/DJs from 9 PM Fri–Sat; acoustic during the week. Kitchen open until 2 AM on weekends. <a href="tel:3864028861">(386) 402-8861</a>' },

  { q: ['beachside tavern','local music venue','live music nsb'],
    a: '<strong>Beachside Tavern</strong> is a classic NSB live music venue and nightlife staple — laid-back local atmosphere with a regular music schedule. Check beachsidetavern.com for upcoming shows.' },

  { q: ['outriggers','tiki bar','tiki drinks','waterfront tiki','dockside drinks','mango tango'],
    a: '<strong>Outriggers Tiki Bar &amp; Grille</strong> is a waterfront tiki bar with tropical cocktails (Mango Tango, Bahama Mama) and dockside dining. Great for a sunset cocktail on the water.' },

  // ── Coffee ────────────────────────────────────────────────────────────────
  { q: ['luma','luma nsb','flagler coffee','people watching coffee','flagler cafe evening'],
    a: '<strong>LUMA NSB</strong> (401 Flagler Ave) is the prime Flagler Ave people-watching spot — coffee, teas, local pastries and sandwiches by day; wine, beer, cocktails, and charcuterie by evening. Sun–Thu 7 AM–8 PM, Fri–Sat 7 AM–10 PM.' },

  { q: ['island roasters','island roasters coffee','causeway coffee','local roast','fair trade coffee'],
    a: '<strong>Island Roasters Coffee</strong> (398 N Causeway) is a locals\' favorite — Fair Trade Organic beans roasted on site, deli sandwiches, and breakfast. Daily 6:30 AM–4 PM. <a href="tel:3868472920">(386) 847-2920</a>' },

  { q: ['cool beans','cool beans cafe','jessamine coffee'],
    a: '<strong>Cool Beans Cafe</strong> (320 Jessamine Ave) has a loyal local following — cozy atmosphere, friendly staff, daily 8 AM–4 PM.' },

  // ── Shopping ──────────────────────────────────────────────────────────────
  { q: ['red dog surf','red dog','surf shop nsb','surfboard buy','surf shop authentic'],
    a: '<strong>Red Dog Surf Shop</strong> (801 A1A at 3rd Ave) is the real deal — locally owned since 1989, one of the last authentic core surf shops on Florida\'s East Coast. Surfboards for sale and rent, bodyboards, surf apparel. <a href="tel:3864238532">(386) 423-8532</a>' },

  { q: ['wilde side','wildeside','board rental','paddleboard rent','kayak rent','beach chair rental','umbrella rental'],
    a: '<strong>Wilde Side Beach and Surf</strong> (512 Flagler Ave) rents paddleboards, surfboards, kayaks, beach chairs, umbrellas, and golf carts. Also sells swimwear and beachwear.' },

  { q: ['candy','chocolate','taffy','saltwater taffy','beachside candy'],
    a: '<strong>Beachside Candy Company</strong> (221 Flagler Ave) makes handmade chocolates and saltwater taffy in-store. A great Flagler Ave treat stop.' },

  { q: ['farmers market','saturday market','fresh produce','local honey','outdoor market'],
    a: 'The <strong>NSB Farmers Market</strong> runs every <strong>Saturday, 7 AM–12 PM</strong> at 210 Sams Ave (Old Fort Park). Fresh produce, local honey and jam, flowers, handmade soaps, jewelry, fresh-squeezed OJ, and hot food vendors. Worth a Saturday morning walk!' },

  { q: ['parking','park on flagler','flagler parking','where to park','metered parking'],
    a: 'Flagler Ave has metered street parking and a small public lot near the beach. On summer weekends it fills by mid-morning — arrive early or park a few blocks back (free side streets). From 815 Carol Ave you can walk or bike to Flagler in minutes.' },

  // ── Water Activities ──────────────────────────────────────────────────────
  { q: ['marine discovery center','marine discovery','eco tour','boat eco tour','nature boat tour','touch tank','naturalist tour'],
    a: '<strong>Marine Discovery Center</strong> (520 Barracuda Blvd) runs guided boat and kayak eco-tours through Indian River Lagoon led by certified Florida Master Naturalists, plus touch tanks and kids programs. Boat tours $40 adults, $20 kids. Mon–Fri 9–5, Sat–Sun 9:30–2:30. marinediscoverycenter.org' },

  { q: ['bioluminescence','bioluminescent','glowing water','glowing kayak','night kayak','night glow tour'],
    a: '<strong>Viking Ecotours</strong> runs nightly Bioluminescence Tours (9–11 PM) — paddling through glowing bioluminescent water in the Indian River Lagoon. A bucket-list experience! ~$120/person. Seasonal (best summer–fall). vikingecotours.com' },

  { q: ['viking ecotours','viking eco','pedal kayak','hands free kayak','kayak sunset'],
    a: '<strong>Viking Ecotours</strong> does pedal kayak tours (you pedal, not paddle!) through Indian River Lagoon. Sunset tours daily 4–6 PM (~$120/person). Bioluminescence tours nightly 9–11 PM. Sea turtle, dolphin, and manatee tours also offered. vikingecotours.com' },

  { q: ['three brothers boards','three brothers','sup lesson','paddleboard lesson','first time paddleboard','first time sup'],
    a: '<strong>Three Brothers Boards</strong> runs guided paddleboard and kayak tours all day (8:30 AM–4:30 PM departures). 95% of guests have never SUPed — lesson included. <a href="tel:3863104927">(386) 310-4927</a> | threebrothersadventuretours.com' },

  { q: ['clear kayak','transparent kayak','spruce creek','get up and go kayaking'],
    a: '<strong>Get Up and Go Kayaking</strong> runs clear-bottomed kayak tours through Spruce Creek — you can see the underwater world below you. Meet at Divito Park, NSB. getupandgokayaking.com' },

  { q: ['dolphin','see dolphins','find dolphins','dolphin watching','dolphin tour','dolphin boat','dolphin cruise'],
    a: 'Resident bottlenose dolphins live in Indian River Lagoon year-round. Best ways to see them: <strong>Turtle Mound River Tours</strong> (Mon–Sat 11 AM, $25/person — turtlemoundriverstours.com); <strong>Marine Discovery Center</strong> eco-tours; kayaking near JB\'s Fish Camp. Or just look from any causeway bridge — sightings are common!' },

  { q: ['manatee','manatees','florida manatee','see manatees','manatee viewing','where to see manatees'],
    a: 'Manatees are in Indian River Lagoon year-round (peak viewing Nov–April). <strong>Best spots near NSB:</strong> Mary McLeod Bethune Beach Park pier (Indian River side); near JB\'s Fish Camp dock; Smyrna Dunes Park in fall/winter. <strong>Best winter viewing:</strong> Blue Spring State Park (~1 hr west) has 100+ manatees Nov–March. Do NOT touch, chase, or feed — federal law. Kayak rentals at JB\'s.' },

  { q: ['turtle mound river tour','river tour boat','history tour boat','mosquito lagoon tour'],
    a: '<strong>Turtle Mound River Tours</strong> runs 2-hour public boat tours Mon–Sat at 11 AM — $25/person through Canaveral National Seashore and Mosquito Lagoon with dolphin/manatee sightings and history narration. turtlemoundriverstours.com' },

  // ── Fishing ───────────────────────────────────────────────────────────────
  { q: ['fishing','fish','fishing charter','redfish','snook','trout','tarpon','offshore fishing','inshore fishing','mosquito lagoon fishing'],
    a: 'NSB has world-class fishing on three fronts. <strong>Inshore:</strong> Mosquito Lagoon is one of the top redfish fisheries in the US; also snook, speckled trout, tarpon, snapper. <strong>Offshore:</strong> mahi, wahoo, sailfish, tuna, grouper. <strong>Charters:</strong> New Smyrna Fishing Charters (newsmyrnafishingcharters.com); Fat Fish Guide Service (fatfishguide.com — Mosquito Lagoon redfish specialist). Florida fishing license required for 16+ — buy at Walmart or myfwc.com.' },

  { q: ['fishing license','need license','myfwc','fishing permit'],
    a: 'A Florida fishing license is required for anyone 16+ fishing from land, piers, or boats. Buy online at myfwc.com, at Walmart, or at local sporting goods stores. Charter boats typically include a license in the trip cost.' },

  // ── Sea Turtle Nesting Tours ──────────────────────────────────────────────
  { q: ['turtle walk','turtle nesting tour','turtle night walk','watch turtle nest','organized turtle tour'],
    a: 'Organized sea turtle nesting tours run <strong>June–July, Fri–Sat nights</strong> at Canaveral National Seashore (Apollo Beach). $25 adults, $10 children. 90% success rate for seeing nesting turtles. Reservations required — open May 15 at Friends of Canaveral. Call (386) 428-3384. Meet at the Apollo Beach Visitor Center.' },

  // ── Art & Culture ─────────────────────────────────────────────────────────
  { q: ['hub on canal','the hub','artists studios','working artists','gallery studios'],
    a: '<strong>The Hub on Canal</strong> (Canal Street, downtown NSB) is home to ~80 working artists in studios and gallery space — painting, ceramics, photography, sculpture, glass, and more. Rotating exhibitions, classes, workshops. The creative heart of NSB. thehuboncanal.org' },

  { q: ['arts on douglas','art gallery nsb','gallery walk','art stroll','images festival','art fiesta','nsb art scene'],
    a: 'NSB is nationally recognized for its art! <strong>Arts on Douglas</strong> (artsondouglas.net) runs 18 exhibitions/year in a 1930s Ford showroom. <strong>The Hub on Canal</strong> has ~80 working artist studios. The <strong>1st Saturday Art Stroll</strong> is a free monthly gallery walk through Canal Street. NSB is listed in "The 100 Best Small Art Towns in America."' },

  // ── Day Trips ─────────────────────────────────────────────────────────────
  { q: ['kennedy space center','ksc','nasa','rocket launch','space center','space shuttle','see a launch'],
    a: 'Kennedy Space Center is ~46 miles south (~1 hour drive). Full-day: IMAX, rocket garden, Atlantis exhibit. Book at kennedyspacecenter.com. <strong>Bonus:</strong> On launch days, NSB\'s beach and causeway are great free viewing spots — you can often see launches from the house! Check the KSC launch schedule at kennedyspacecenter.com/launches.' },

  { q: ['de leon springs','deleon springs','pancake griddle','natural spring swim','make your own pancakes'],
    a: '<strong>De Leon Springs State Park</strong> (~40 miles northwest, ~1 hour) has 68°F crystal-clear spring swimming year-round. The <strong>Old Spanish Sugar Mill restaurant</strong> is unique — make your own pancakes on a griddle built into your table! Also kayaking on the spring run. A fantastic half-day trip.' },

  { q: ['blue spring','blue spring state park','winter manatees','orange city manatees','manatee state park'],
    a: '<strong>Blue Spring State Park</strong> (~1 hour west, near Orange City) is Florida\'s premier winter manatee viewing — 100+ manatees crowd the warm spring water Nov–March. Also great for swimming and kayaking. Free entry with Florida State Parks pass.' },

  { q: ['st augustine','st. augustine','augustine','oldest city','castillo de san marcos','colonial history'],
    a: '<strong>St. Augustine</strong> is ~75 miles north (~1.5 hours) — the oldest city in the US (founded 1565). Castillo de San Marcos fort, Colonial Quarter, St. George Street shops and dining, the historic lighthouse. Fun fact: descendants of NSB\'s 1768 Minorcan colonists still live in St. Augustine today.' },

  { q: ['daytona beach','daytona','nascar speedway','daytona boardwalk','daytona trip'],
    a: '<strong>Daytona Beach</strong> is ~30 min north — Daytona International Speedway (tours available year-round), the classic beach boardwalk, Main Street. NSB locals say Daytona is louder and more commercial; NSB is the quieter, more local version. But great for a Speedway visit or classic American beach day trip.' },

  { q: ['orlando','disney world','universal studios','theme parks','seaworld','disney','universal'],
    a: 'Theme parks are ~1–1.5 hours west: Walt Disney World (~75 miles), Universal Studios (~65 miles), SeaWorld, ICON Park. Book tickets in advance. Weekdays have smaller crowds. Take SR 528 (Beachline Expressway) west for the fastest route.' },

  // ── Airboats ──────────────────────────────────────────────────────────────
  { q: ['airboat','airboat ride','airboat tour','swamp tour','alligator tour','florida gator tour'],
    a: 'Airboat tours through Florida wetlands are a blast — several operators are within ~30–45 minutes of NSB. Search "airboat rides New Smyrna Beach" for current operators (the lineup changes seasonally). Great for seeing alligators, birds, and Florida backcountry up close.' },

  // ── Sharks ────────────────────────────────────────────────────────────────
  { q: ['shark','sharks','shark bite','shark attack','safe swimming','shark capital','is it safe to swim'],
    a: 'NSB/Volusia County holds the world record for shark incidents ("Shark Bite Capital of the World") — but context matters: the vast majority are minor nips from small spinner and blacktip sharks. Serious injuries are rare; fatalities are extremely rare. The high count just reflects the enormous number of people in the water year-round. To minimize risk: avoid dawn/dusk swimming, stay out of murky water, don\'t wear shiny jewelry, avoid fishing piers. People swim here every single day — it\'s safe and fun!' },

  // ── Canaveral National Seashore ───────────────────────────────────────────
  { q: ['canaveral','national seashore','apollo beach','undeveloped beach','pristine beach','seashore entrance fee'],
    a: '<strong>Canaveral National Seashore</strong> (entrance at 7611 S Atlantic Ave, ~3 miles south) has 24 miles of completely undeveloped beach — the longest stretch of undisturbed Atlantic coast in Florida. Entry: $25/vehicle (7-day pass). 5 parking lots; lifeguards at Lot 1 only (Memorial Day–Labor Day). Also has Turtle Mound and Mosquito Lagoon kayaking.' },

  // ── Golf Courses ──────────────────────────────────────────────────────────
  { q: ['golf course','tee time','golf club','play golf','municipal golf','public golf nsb'],
    a: 'NSB has 4 golf options: <strong>New Smyrna Municipal Golf Course</strong> (designed by Bobby Weed & Donald Ross, affordable — sportsvolusia.com); <strong>New Smyrna Golf Club</strong> (18-hole public — newsmyrnagolfclub.com); <strong>Sugar Mill Country Club</strong> (27-hole championship by Joe Lee — sugarmillcc.com); <strong>The Preserve at Turnbull Bay</strong> (18-hole par 72 through a nature preserve — thepreserveatturnbull.com).' },

  // ── NSB Vibe & Character ──────────────────────────────────────────────────
  { q: ['about nsb','what is nsb','nsb vibe','what makes nsb special','old florida','nsb character','new smyrna vibe','different from daytona'],
    a: 'New Smyrna Beach is a <strong>real town</strong> — genuine surf culture, a nationally recognized art scene, 250+ years of history, and mostly independent local restaurants. No high-rises on the beach, no chain takeover of Flagler Ave. NSB is listed among America\'s 100 best small art towns. Small enough to walk, world-class nature on its doorstep, 1 hour from everything in Central Florida. People who discover it keep coming back — that\'s the whole story.' },
];

function chatMatch(input) {
  const lower = input.toLowerCase().trim();
  if (!lower) return null;

  // Try Fuse.js fuzzy search if available
  if (typeof Fuse !== 'undefined') {
    const all = KB.flatMap(entry => entry.q.map(kw => ({ kw, a: entry.a })));
    const fuse = new Fuse(all, { keys: ['kw'], threshold: 0.4 });
    const results = fuse.search(lower);
    if (results.length > 0) return results[0].item.a;
  }

  // Fallback: simple includes
  for (const entry of KB) {
    if (entry.q.some(kw => lower.includes(kw))) return entry.a;
  }

  return 'I\'m not sure about that one — but your host Antonio is just a message away! His contact info is in your Airbnb booking confirmation.';
}

// ── Chat Widget State ─────────────────────────────────────────────────────
(function initChatWidget() {
  const fab          = document.getElementById('chat-fab');
  const overlay      = document.getElementById('chat-overlay');
  const backdrop     = document.getElementById('chat-overlay-backdrop');
  const minimizeBtn  = document.getElementById('chat-minimize');
  const closeBtn     = document.getElementById('chat-close');
  const input        = document.getElementById('chat-input');
  const sendBtn      = document.getElementById('chat-send');
  const msgs         = document.getElementById('chat-messages');

  if (!fab || !overlay) return;

  // ── iOS scroll lock ────────────────────────────────────────────────────
  // overflow:hidden on body doesn't work on iOS Safari — use position:fixed trick.
  let _savedScrollY = 0;
  function lockBodyScroll() {
    _savedScrollY = window.scrollY;
    document.body.style.position   = 'fixed';
    document.body.style.top        = '-' + _savedScrollY + 'px';
    document.body.style.left       = '0';
    document.body.style.right      = '0';
    document.body.style.overflowY  = 'scroll';
  }
  function unlockBodyScroll() {
    document.body.style.position  = '';
    document.body.style.top       = '';
    document.body.style.left      = '';
    document.body.style.right     = '';
    document.body.style.overflowY = '';
    window.scrollTo(0, _savedScrollY);
  }

  // ── Visual viewport resize (iOS keyboard) ──────────────────────────────
  // When keyboard opens, iOS shrinks the visual viewport but position:fixed
  // stays anchored to the layout viewport — leaving a gap. Sync overlay to
  // the visual viewport so it always covers exactly the visible screen.
  function syncOverlayToViewport() {
    if (!overlay.classList.contains('open')) return;
    const vv = window.visualViewport;
    if (!vv) return;
    overlay.style.top    = vv.offsetTop  + 'px';
    overlay.style.left   = vv.offsetLeft + 'px';
    overlay.style.width  = vv.width      + 'px';
    overlay.style.height = vv.height     + 'px';
  }
  function resetOverlaySize() {
    overlay.style.top = overlay.style.left = overlay.style.width = overlay.style.height = '';
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncOverlayToViewport, { passive: true });
    window.visualViewport.addEventListener('scroll', syncOverlayToViewport, { passive: true });
  }

  // Fallback touchmove block for older iOS that lacks visualViewport
  const _blockBgTouch = function(e) {
    if (!e.target.closest('.chat-modal-panel')) e.preventDefault();
  };

  function openChat() {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    fab.classList.add('hidden');
    lockBodyScroll();
    syncOverlayToViewport();
    document.addEventListener('touchmove', _blockBgTouch, { passive: false });
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover';
  }

  function minimizeChat() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    fab.classList.remove('hidden');
    unlockBodyScroll();
    resetOverlaySize();
    document.removeEventListener('touchmove', _blockBgTouch);
    if (document.activeElement) document.activeElement.blur();
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
  }

  function closeChat() {
    minimizeChat(); // same behavior — FAB stays accessible
  }

  fab.addEventListener('click', openChat);
  if (minimizeBtn) minimizeBtn.addEventListener('click', minimizeChat);
  if (closeBtn)    closeBtn.addEventListener('click', closeChat);

  // Click outside panel minimizes
  if (backdrop) {
    backdrop.addEventListener('click', minimizeChat);
  }

  // Escape key minimizes
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) minimizeChat();
  });

  function addBubble(html, cls) {
    const div = document.createElement('div');
    div.className = 'chat-bubble ' + cls;
    div.innerHTML = html;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function handleSend() {
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    addBubble(text, 'chat-user');
    input.value = '';
    setTimeout(() => addBubble(chatMatch(text), 'chat-bot'), 350);
  }

  if (sendBtn) sendBtn.addEventListener('click', handleSend);
  if (input) {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });

    // Prevent iOS auto-zoom on input focus by pinning maximum-scale=1 while typing
    const vp = document.querySelector('meta[name="viewport"]');
    input.addEventListener('focus', () => {
      if (vp) vp.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover';
    });
    input.addEventListener('blur', () => {
      if (vp) vp.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
    });
  }

  // Minimize chat when user clicks an internal section link inside a bot message
  if (msgs) {
    msgs.addEventListener('click', e => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      minimizeChat();
      if (target) {
        requestAnimationFrame(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    });
  }
})();
