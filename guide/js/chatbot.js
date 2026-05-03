// chatbot.js — Local Knowledge Base Chatbot

const KB = [
  { q: ['wifi','internet','password','network','connection'],
    a: 'The WiFi network and password are on the Quick Info card at the top — tap it to copy!' },
  { q: ['door','code','lock','access','entry','keypad','pin'],
    a: 'The door code is on the Quick Info card at the top. Tap to copy!' },
  { q: ['checkout','check out','check-out','leave','leaving','departure'],
    a: 'Check-out is at 10:00 AM. See the Checkout Checklist section for what to do before you go.' },
  { q: ['checkin','check in','check-in','arrive','arrival','when can'],
    a: 'Check-in is at 4:00 PM. The door code is on the Quick Info card.' },
  { q: ['pool','swim','swimming'],
    a: 'The private pool is in the backyard. Enjoy! Please shower before entering.' },
  { q: ['hot tub','jacuzzi','spa','jets','tub'],
    a: 'See the Hot Tub section for step-by-step startup instructions. It can take 1–2 hours to heat from cold — start it early!' },
  { q: ['beach','ocean','surf','wave','sand','water'],
    a: 'The beach is about 5 minutes away by bike or car. Beach gear is in the garage — chairs, umbrella, towels, cart, and toys.' },
  { q: ['bike','bicycle','cruiser','cycle','ride'],
    a: 'Beach cruiser bikes are in the garage. The lock code is 81518. See Getting Around for more details!' },
  { q: ['parking','park','car','vehicle','garage','drive'],
    a: 'Parking is in the driveway and garage. For the beach, biking or walking is recommended in peak season.' },
  { q: ['margaritaville','frozen','cocktail','blender','drinks'],
    a: 'The Margaritaville maker is in the kitchen! Add ice to the top reservoir, your mixer to the blending jar, and press blend. Enjoy!' },
  { q: ['coffee','espresso','nespresso','brew','cappuccino','latte'],
    a: 'There\'s a super-automatic espresso machine and a Nespresso machine in the kitchen. See The House → Espresso & Coffee for instructions.' },
  { q: ['trash','garbage','bin','waste','rubbish'],
    a: 'Trash bins are in the pull-out drawer to the left of the pantry. Extra bags are under the kitchen sink.' },
  { q: ['laundry','washer','dryer','wash','clothes','towel'],
    a: 'Washer and dryer are in the laundry room. Detergent is provided. Wash pool towels separately from white linens.' },
  { q: ['tv','television','netflix','hulu','streaming','channel','remote'],
    a: 'Every room has a Smart TV with Netflix, Hulu, YouTube TV, and more. Sign in with your own account and please sign out before checkout.' },
  { q: ['game','arcade','air hockey','gaming','room upstairs'],
    a: 'The game room is upstairs with retro arcade games and a professional air hockey table. If anything has power issues, check the plug at the back.' },
  { q: ['massage','chair','relax','zero gravity'],
    a: 'The zero-gravity massage chair is in the living area. Use the remote to pick a program. Recline with the footrest lever on the side. Enjoy!' },
  { q: ['contact','host','antonio','yani','help','problem','issue','emergency'],
    a: 'For any urgent issues, contact your host Antonio. His contact info was included in your Airbnb booking confirmation.' },
  { q: ['golf','putting','green','putt'],
    a: 'There\'s a putting green in the backyard! Putters are available — enjoy!' },
  { q: ['restaurant','eat','food','dinner','lunch','breakfast','dining'],
    a: 'Check the Local Guide section! We recommend The Breakers (beachfront burgers), The Garlic (Italian with garden seating), Outriggers (waterfront tiki bar), and The Spott (upscale — reserve ahead!).' },
  { q: ['bar','drink','cocktail','beer','wine','happy hour'],
    a: 'Check the Local Guide and filter by "Drink"! Outriggers Tiki Bar is a favorite for sunset tropical cocktails.' },
  { q: ['coffee shop','cafe','latte','espresso bar'],
    a: 'Filter the Local Guide to "Coffee" for our favorite nearby spots!' },
  { q: ['flagler','shopping','shops','store','avenue','downtown beach'],
    a: 'Flagler Avenue is the heart of NSB — local shops, restaurants, festivals, and direct beach access. A must-visit!' },
  { q: ['dunes','park','nature','hike','trail','boardwalk','wildlife'],
    a: 'Smyrna Dunes Park is 184 acres of boardwalk trails, wildlife, and stunning Ponce Inlet views. Dog-friendly too!' },
  { q: ['canal','historic','gallery','art','causeway','bridge'],
    a: 'Canal Street Historic District is across the causeway — art galleries, local eateries, and charming historic architecture.' },
  { q: ['golf cart','cart','rental','rent salty'],
    a: 'Golf cart rentals: Salty Rentals is walking distance from the house. Call 386-410-5558.' },
  { q: ['turtle','sea turtle','nest','nesting','egg'],
    a: 'NSB is a sea turtle nesting area. Please don\'t disturb any nests and avoid bright lights near the beach after dark.' },
  { q: ['dog','pet','animal','bring','allowed'],
    a: 'Dogs are allowed on the beach! Please clean up after your pet. No glass containers on the beach.' },
  { q: ['ac','air condition','heat','cool','thermostat','temperature','cold','hot'],
    a: 'Use the thermostat to set your preferred temperature. Keep all windows and doors closed — the AC shuts off if left open.' },
  { q: ['toilet','flush','plumb','clog','water','sink','drain'],
    a: 'Please only flush toilet paper — no wipes or feminine products even if labeled flushable. For plumbing issues, contact Antonio.' },
  { q: ['clean','cleaning','mop','broom','vacuum','sweep'],
    a: 'Cleaning tools (brooms, mops, vacuum) are in the laundry room or garage. Supplies and dishwasher detergent are under the kitchen sink.' },
  { q: ['key','spare','lock','locked out'],
    a: 'There is a keypad door lock — no physical key needed. The code is on the Quick Info card at the top.' },
  { q: ['uber','lyft','taxi','ride'],
    a: 'Uber and Lyft are available in NSB. For a local experience, consider golf cart rentals at Salty Rentals (386-410-5558).' },
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

(function initChat() {
  const input = document.getElementById('chat-input');
  const send  = document.getElementById('chat-send');
  const msgs  = document.getElementById('chat-messages');
  if (!input || !send || !msgs) return;

  function addBubble(text, cls) {
    const div = document.createElement('div');
    div.className = 'chat-bubble ' + cls;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    addBubble(text, 'chat-user');
    input.value = '';
    setTimeout(() => addBubble(chatMatch(text), 'chat-bot'), 350);
  }

  send.addEventListener('click', handleSend);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });
})();
