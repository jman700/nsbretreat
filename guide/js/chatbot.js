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
    a: 'The beach is about a 3-minute walk. Beach gear is in the garage. Check <a href="#beach">Beach Tips</a> for everything you need to know.' },
  { q: ['bike','bicycle','cruiser','cycle','ride'],
    a: 'Beach cruiser bikes are in the garage. Lock code: 81518. See <a href="#around">Getting Around</a> for more.' },
  { q: ['margaritaville','frozen','cocktail','blender','drinks'],
    a: 'The Margaritaville maker is in the kitchen! Add ice to the top reservoir, your mixer to the blending jar, and press blend. Enjoy!' },
  { q: ['coffee','espresso','nespresso','brew','cappuccino','latte','keurig','french press','moka','folgers'],
    a: 'We provide Folgers ground coffee — drip maker, French press, and Bialetti Moka Express are in the kitchen/pantry. Also a super-automatic espresso machine (whole bean only — try Island Roasters or illy Classico from Publix), Nespresso Original, and Keurig. See <a href="#house">The House → Espresso &amp; Coffee</a>.' },
  { q: ['grill','bbq','barbecue','gas','cook outside','propane'],
    a: 'The grill runs on the home\'s natural gas line (no propane tank). Twist the mechanical gas timer to the left of the grill to start gas flow; check the shut-off knob under the grill is in-line with the hose. Timer auto-shuts off — twist again if grilling longer. Turn it off when done. See <a href="#house">The House → Grill</a>.' },
  { q: ['spice','spices','pantry','cooking','supplies','ingredients'],
    a: 'We provide a variety of spices and basic cooking items — check the pantry before purchasing extras. See <a href="#house">The House → Kitchen Appliances</a>.' },
  { q: ['ice','ice maker','cooler'],
    a: 'The fridge has an ice maker for normal family use. Large groups may want to grab extra bags of ice for coolers. See <a href="#house">The House → Kitchen Appliances</a>.' },
  { q: ['towel','beach towel','pool towel','where are towels','linen'],
    a: 'Beach and pool towels are in the <strong>second-floor double-door closet near the game room</strong>. Please wash pool towels separately from white linens.' },
  { q: ['trash','garbage','bin','waste','rubbish'],
    a: 'Trash bins are in the pull-out drawer to the left of the pantry. Extra bags are under the kitchen sink.' },
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
    a: 'Dogs are allowed on the beach! Clean up after your pet. No glass containers on the beach. See <a href="#beach">Beach Tips</a>.' },
  { q: ['ac','air condition','heat','cool','thermostat','temperature','cold'],
    a: 'Adjust the thermostat to your preferred temp. Keep windows and doors closed — the AC shuts off if left open. See <a href="#house">The House → Heating &amp; Cooling</a>.' },
  { q: ['toilet','flush','plumb','clog','sink','drain'],
    a: 'Please only flush toilet paper — no wipes or feminine products even if labeled flushable. For plumbing issues, contact Antonio immediately. See <a href="#house">The House → Water &amp; Plumbing</a>.' },
  { q: ['clean','cleaning','mop','broom','vacuum','sweep'],
    a: 'Cleaning tools (brooms, mops, vacuum) are in the laundry room or garage. Supplies are under the kitchen sink. See <a href="#house">The House → Cleaning Supplies</a>.' },
  { q: ['uber','lyft','taxi','ride','transport'],
    a: 'Uber and Lyft are available in NSB. For a fun local option, Salty Rentals does golf cart rentals (386-410-5558). See <a href="#around">Getting Around</a>.' },
  { q: ['address','location','where','directions','navigate'],
    a: 'The address is <strong>815 Carol Avenue, New Smyrna Beach, FL 32169</strong>.' },
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

  function openChat() {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    fab.classList.add('hidden');
    document.body.style.overflow = 'hidden'; // lock background scroll
    // Do NOT auto-focus input — prevents iOS from zooming page on open
  }

  function minimizeChat() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    fab.classList.remove('hidden');
    document.body.style.overflow = ''; // restore scroll
    // Blur any focused input to dismiss keyboard + reset iOS zoom
    if (document.activeElement) document.activeElement.blur();
    // Force viewport reset on iOS (cancel any zoom state)
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp) {
      vp.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
    }
  }

  function closeChat() {
    minimizeChat(); // same behavior — FAB stays accessible
  }

  // Prevent iOS Safari from zooming on input focus by locking scale briefly
  if (input) {
    input.addEventListener('focus', function() {
      const vp = document.querySelector('meta[name="viewport"]');
      if (vp) vp.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover';
    });
    input.addEventListener('blur', function() {
      const vp = document.querySelector('meta[name="viewport"]');
      if (vp) vp.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
    });
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
