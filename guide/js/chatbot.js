// chatbot.js — Local Knowledge Base Chatbot

const KB = [
  { q: ['wifi','internet','password','network','connection'],
    a: 'The WiFi network and password are on the <a href="#quick">Quick Info</a> cards at the top — tap to copy!' },
  { q: ['checkout','check out','check-out','leave','leaving','departure'],
    a: 'Check-out is at 10:00 AM. See the <a href="#checkout">Checkout section</a> for everything to do before you go.' },
  { q: ['checkin','check in','check-in','arrive','arrival','when can'],
    a: 'Check-in is at 4:00 PM. The door code is on the <a href="#quick">Quick Info</a> card.' },
  { q: ['pool','swim','swimming'],
    a: 'The private pool is in the backyard. Enjoy! Please shower before entering.' },
  { q: ['hot tub','jacuzzi','spa','jets','tub'],
    a: 'The hot tub is iPad-controlled and takes 20–45 minutes to heat. See the <a href="#hottub">Hot Tub section</a> for step-by-step instructions.' },
  { q: ['beach','ocean','surf','wave','sand','water'],
    a: 'The beach is about a 3-minute walk. Beach gear is in the garage. Check <a href="#beach">Beach Tips</a> for everything you need to know.' },
  { q: ['bike','bicycle','cruiser','cycle','ride'],
    a: 'Beach cruiser bikes are in the garage. Lock code: 81518. See <a href="#around">Getting Around</a> for more details.' },
  { q: ['parking','park','car','vehicle','garage','drive'],
    a: 'Parking is in the driveway and garage. For the beach, biking or walking is recommended in peak season.' },
  { q: ['margaritaville','frozen','cocktail','blender','drinks'],
    a: 'The Margaritaville maker is in the kitchen! Add ice to the top reservoir, your mixer to the blending jar, and press blend. Enjoy!' },
  { q: ['coffee','espresso','nespresso','brew','cappuccino','latte'],
    a: 'There\'s a super-automatic espresso machine and a Nespresso machine in the kitchen. See <a href="#house">The House → Espresso &amp; Coffee</a> for instructions.' },
  { q: ['trash','garbage','bin','waste','rubbish'],
    a: 'Trash bins are in the pull-out drawer to the left of the pantry. Extra bags are under the kitchen sink.' },
  { q: ['laundry','washer','dryer','wash','clothes','towel'],
    a: 'Washer and dryer are in the laundry room. Detergent is provided. Wash pool towels separately from white linens. See <a href="#house">The House → Laundry</a>.' },
  { q: ['tv','television','netflix','hulu','streaming','channel','remote'],
    a: 'Every room has a Smart TV with Netflix, Hulu, YouTube TV, and more. Sign in with your own account and please sign out before checkout.' },
  { q: ['game','arcade','air hockey','gaming','room upstairs'],
    a: 'The game room is upstairs with retro arcade games and an air hockey table. If anything has power issues, check the plug at the back. See <a href="#house">The House → Game Room</a>.' },
  { q: ['massage','chair','relax','zero gravity'],
    a: 'The zero-gravity massage chair is in the <strong>first floor master bedroom</strong>. Use the remote to pick a program. Recline with the footrest lever. See <a href="#house">The House → Massage Chair</a>.' },
  { q: ['contact','host','antonio','yani','help','problem','issue','emergency'],
    a: 'For any questions or urgent issues, call or text Antonio directly: <a href="tel:4075066654">(407) 506-6654</a>' },
  { q: ['golf','putting','green','putt'],
    a: 'There\'s a putting green in the backyard! Putters are available — enjoy.' },
  { q: ['restaurant','eat','food','dinner','lunch','breakfast','dining'],
    a: 'Check the <a href="#local">Local Guide</a> — filter by "Eat"! We love The Breakers (beachfront burgers), The Garlic (Italian), Outriggers (tiki bar), and The Spott (upscale).' },
  { q: ['bar','drink','cocktail','beer','wine','happy hour','brewery'],
    a: 'Filter the <a href="#local">Local Guide</a> to "Drink"! Flagler Tavern, Outriggers Tiki Bar, and New Smyrna Brewing Co. are all great picks.' },
  { q: ['coffee shop','cafe','latte'],
    a: 'Filter the <a href="#local">Local Guide</a> to "Coffee" for our favorite nearby spots — Java Joint and Brew-Ha Ha are favorites.' },
  { q: ['flagler','shopping','shops','store','avenue','downtown beach'],
    a: 'Flagler Avenue is the heart of NSB. See it in the <a href="#local">Local Guide</a> under "See" — shops, restaurants, festivals, and direct beach access.' },
  { q: ['dunes','park','nature','hike','trail','boardwalk','wildlife'],
    a: 'Smyrna Dunes Park is 184 acres of boardwalk trails, wildlife, and Ponce Inlet views. Find it in the <a href="#local">Local Guide</a> under "Do".' },
  { q: ['canal','historic','gallery','art','causeway','bridge'],
    a: 'Canal Street Historic District is across the causeway — art galleries, local eateries, and charming architecture. In the <a href="#local">Local Guide</a> under "See".' },
  { q: ['golf cart','cart','rental','salty'],
    a: 'Golf cart rentals: Salty Rentals is walking distance from the house. Call 386-410-5558. See <a href="#around">Getting Around</a>.' },
  { q: ['surf','surfing','lesson','paddle','kayak'],
    a: 'NSB is one of Florida\'s best surf spots. Surf lessons and kayak rentals are in the <a href="#local">Local Guide</a> under "Do".' },
  { q: ['turtle','sea turtle','nest','nesting','egg'],
    a: 'NSB is a sea turtle nesting area. Don\'t disturb nests or use bright lights near the beach after dark. More tips in <a href="#beach">Beach Tips</a>.' },
  { q: ['dog','pet','animal','bring','allowed'],
    a: 'Dogs are allowed on the beach! Clean up after your pet. No glass containers on the beach. See <a href="#beach">Beach Tips</a>.' },
  { q: ['ac','air condition','heat','cool','thermostat','temperature','cold'],
    a: 'Use the thermostat to set your preferred temperature. Keep all windows and doors closed — the AC shuts off if left open. See <a href="#house">The House → Heating &amp; Cooling</a>.' },
  { q: ['toilet','flush','plumb','clog','sink','drain'],
    a: 'Please only flush toilet paper — no wipes or feminine products even if labeled flushable. For plumbing issues, contact Antonio. See <a href="#house">The House → Water &amp; Plumbing</a>.' },
  { q: ['clean','cleaning','mop','broom','vacuum','sweep'],
    a: 'Cleaning tools (brooms, mops, vacuum) are in the laundry room or garage. Supplies are under the kitchen sink. See <a href="#house">The House → Cleaning Supplies</a>.' },
  { q: ['key','lock','locked out','door','entry','access','code'],
    a: 'There is a keypad door lock — no physical key needed. The code is on the <a href="#quick">Quick Info</a> cards at the top.' },
  { q: ['uber','lyft','taxi','ride'],
    a: 'Uber and Lyft are available in NSB. For a local experience, consider golf cart rentals at Salty Rentals (386-410-5558). See <a href="#around">Getting Around</a>.' },
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
