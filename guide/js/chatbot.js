let fuse;

async function initChatbot() {
  try {
    const res = await fetch('data/knowledgebase.json');
    const kb = await res.json();
    fuse = new Fuse(kb, {
      keys: ['q', 'tags'],
      threshold: 0.45,
      includeScore: true
    });
  } catch (err) {
    console.warn('Chatbot init failed:', err);
  }
}

function getAnswer(query) {
  if (!fuse) return null;
  const results = fuse.search(query);
  if (results.length === 0 || results[0].score > 0.6) return null;
  return results[0].item.a;
}

function addMessage(text, role) {
  const messages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-bubble chat-${role}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function handleSend() {
  const input = document.getElementById('chat-input');
  const query = input.value.trim();
  if (!query) return;
  input.value = '';
  addMessage(query, 'user');
  setTimeout(() => {
    const answer = getAnswer(query);
    if (answer) {
      addMessage(answer, 'bot');
    } else {
      addMessage(`Great question! I'm not sure about that one. Text Antonio directly at ${CONFIG.host_phone} for help.`, 'bot');
    }
  }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
  initChatbot();
  document.getElementById('chat-send').addEventListener('click', handleSend);
  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSend();
  });
});
