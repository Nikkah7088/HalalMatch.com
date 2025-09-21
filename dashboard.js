import { getAuth, onAuthStateChanged, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, arrayUnion, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

const auth = window.auth;
const db = window.db;

// Global variables
let currentUser = null;
let currentChatId = null;
let chatTimers = {};
let mediaRecorder = null;
let audioChunks = [];

// Auth check
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadDashboard();
  } else {
    window.location.href = 'login.html';
  }
});

// Load dashboard
function loadDashboard() {
  loadProfileCompletion();
  loadNotifications();
  loadChats();
  checkBlockStatus();
  loadActivityMonitor();
  setupEventListeners();
}

// Check and display block status
function checkBlockStatus() {
  const blockKey = blockStorageKeyPrefix + currentUser.uid;
  const blockDataRaw = localStorage.getItem(blockKey);
  if (blockDataRaw) {
    const blockData = JSON.parse(blockDataRaw);
    const now = Date.now();
    const notificationDiv = document.getElementById('blockNotification');
    const messageDiv = document.getElementById('blockMessage');

    if (blockData.type === "temporary") {
      if (now < blockData.expiresAt) {
        messageDiv.textContent = `Your account is temporarily blocked until ${new Date(blockData.expiresAt).toLocaleDateString()}. If you repeat this mistake, you will be blocked permanently.`;
        notificationDiv.classList.remove('hidden');
      } else {
        // Unblock after expiration
        localStorage.removeItem(blockKey);
        notificationDiv.classList.add('hidden');
        alert("Your temporary block has expired. You can now use all features.");
      }
    } else if (blockData.type === "permanent") {
      messageDiv.textContent = "Your account is permanently banned due to repeated misconduct. Your profile is removed from search.";
      notificationDiv.classList.remove('hidden');
    }
  }
}

// Profile completion
async function loadProfileCompletion() {
  const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
  if (userDoc.exists()) {
    const profile = userDoc.data();
    const fields = ['name', 'age', 'gender', 'religion', 'location', 'education', 'occupation', 'about'];
    const completed = fields.filter(field => profile[field]).length;
    const percentage = Math.round((completed / fields.length) * 100);
    document.getElementById('progressFill').style.width = `${percentage}%`;
    document.getElementById('progressText').textContent = `${percentage}% Complete`;
  }
}

// Notifications
function loadNotifications() {
  const q = query(collection(db, 'notifications'), where('userId', '==', currentUser.uid), orderBy('timestamp', 'desc'));
  onSnapshot(q, (snapshot) => {
    const notificationsList = document.getElementById('notificationsList');
    notificationsList.innerHTML = '';
    snapshot.forEach((doc) => {
      const notification = doc.data();
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `
        <h4 class="font-semibold">${notification.title}</h4>
        <p class="text-gray-600">${notification.message}</p>
        <small class="text-gray-500">${new Date(notification.timestamp.toDate()).toLocaleString()}</small>
      `;
      notificationsList.appendChild(div);
    });
  });
}

// Messaging
const violationKeywords = [
  "disrespectful", "offensive", "insult", "disappoint", "wrong", "disturbing", "abuse", "hate", "racist", "sexist", "swear"
];

const violationWarningLimit = 1;
const violationTempBlockLimit = 2;
const violationPermanentBlockLimit = 3;

const violationStorageKeyPrefix = "violation_";
const blockStorageKeyPrefix = "block_";

function loadChats() {
  const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.uid));
  onSnapshot(q, (snapshot) => {
    const chatList = document.getElementById('chatList');
    chatList.innerHTML = '';
    snapshot.forEach((doc) => {
      const chat = doc.data();
      const otherParticipant = chat.participants.find(p => p !== currentUser.uid);
      const div = document.createElement('div');
      div.className = 'message-item';
      div.innerHTML = `<strong>Chat with ${otherParticipant}</strong>`;
      div.onclick = () => openChat(doc.id, otherParticipant);
      chatList.appendChild(div);
    });
  });
}

async function openChat(chatId, otherParticipant) {
  currentChatId = chatId;
  document.getElementById('noChatSelected').classList.add('hidden');
  document.getElementById('chatWindow').classList.remove('hidden');

  // Check if user is blocked
  const blockKey = blockStorageKeyPrefix + currentUser.uid;
  const blockDataRaw = localStorage.getItem(blockKey);
  if (blockDataRaw) {
    const blockData = JSON.parse(blockDataRaw);
    const now = Date.now();
    if (blockData.type === "temporary") {
      if (now < blockData.expiresAt) {
        document.getElementById('messageInput').disabled = true;
        document.getElementById('voiceRecordBtn').disabled = true;
        document.getElementById('sendMessageBtn').disabled = true;
        document.getElementById('messageInput').placeholder = `Your account is temporarily blocked until ${new Date(blockData.expiresAt).toLocaleDateString()}`;
        return;
      } else {
        // Unblock after expiration
        localStorage.removeItem(blockKey);
        alert("Your temporary block has expired. You can now send messages.");
        document.getElementById('messageInput').disabled = false;
        document.getElementById('voiceRecordBtn').disabled = false;
        document.getElementById('sendMessageBtn').disabled = false;
      }
    } else if (blockData.type === "permanent") {
      document.getElementById('messageInput').disabled = true;
      document.getElementById('voiceRecordBtn').disabled = true;
      document.getElementById('sendMessageBtn').disabled = true;
      document.getElementById('messageInput').placeholder = "Your account is permanently banned.";
      return;
    }
  }

  // Load messages
  const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
  onSnapshot(q, (snapshot) => {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    snapshot.forEach((doc) => {
      const message = doc.data();
      const div = document.createElement('div');
      div.className = `mb-2 ${message.senderId === currentUser.uid ? 'text-right' : 'text-left'}`;
      if (message.type === 'text') {
        div.innerHTML = `<strong>${message.senderId === currentUser.uid ? 'You' : otherParticipant}:</strong> ${message.text}`;
      } else if (message.type === 'voice') {
        div.innerHTML = `<strong>${message.senderId === currentUser.uid ? 'You' : otherParticipant}:</strong> <audio controls src="${message.audioUrl}"></audio>`;
      }
      chatMessages.appendChild(div);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// Voice recording handlers
document.getElementById('voiceRecordBtn').addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
  } else {
    startRecording();
  }
});

function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.start();
      mediaRecorder.addEventListener('dataavailable', event => {
        audioChunks.push(event.data);
      });
      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        uploadAudio(audioBlob);
      });
      document.getElementById('voiceStatus').classList.remove('hidden');
      document.getElementById('voiceRecordBtn').textContent = '⏹️';
    })
    .catch(err => {
      alert('Microphone access denied or not available.');
    });
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    document.getElementById('voiceStatus').classList.add('hidden');
    document.getElementById('voiceRecordBtn').textContent = '🎤';
  }
}

async function uploadAudio(audioBlob) {
  if (!currentChatId) {
    alert('No chat selected.');
    return;
  }
  const storage = getStorage();
  const audioRef = ref(storage, `voiceMessages/${currentChatId}/${Date.now()}.webm`);
  try {
    await uploadBytes(audioRef, audioBlob);
    const audioUrl = await getDownloadURL(audioRef);
    await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
      senderId: currentUser.uid,
      timestamp: Timestamp.now(),
      type: 'voice',
      audioUrl
    });
  } catch (error) {
    console.error('Error uploading audio:', error);
    alert('Failed to send voice message.');
  }
}

// Send text message (updated to support text type)
async function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const text = messageInput.value.trim();
  if (!text || !currentChatId) return;

  // Check if user is blocked before sending
  const blockKey = blockStorageKeyPrefix + currentUser.uid;
  const blockDataRaw = localStorage.getItem(blockKey);
  if (blockDataRaw) {
    const blockData = JSON.parse(blockDataRaw);
    const now = Date.now();
    if (blockData.type === "temporary" && now < blockData.expiresAt) {
      alert(`Your account is temporarily blocked until ${new Date(blockData.expiresAt).toLocaleDateString()}. You cannot send messages.`);
      return;
    }
    if (blockData.type === "permanent") {
      alert("Your account is permanently banned. You cannot send messages.");
      return;
    }
  }

  // Check for violation keywords
  const lowerText = text.toLowerCase();
  const foundViolations = violationKeywords.filter(keyword => lowerText.includes(keyword));

  if (foundViolations.length > 0) {
    await handleViolation(foundViolations);
    return;
  }

  try {
    await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
      text,
      senderId: currentUser.uid,
      timestamp: Timestamp.now(),
      type: 'text'
    });

    messageInput.value = '';
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Periodic cleanup of chats older than 7 days
async function cleanupOldChats() {
  const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.uid));
  const snapshot = await getDocs(q);
  const now = Date.now();

  snapshot.forEach(async (docSnap) => {
    const chatId = docSnap.id;
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);

    messagesSnapshot.forEach(async (msgDoc) => {
      const msgData = msgDoc.data();
      const msgTime = msgData.timestamp.toDate().getTime();
      if (now - msgTime > 7 * 24 * 60 * 60 * 1000) {
        // Delete message
        await deleteDoc(doc(db, 'chats', chatId, 'messages', msgDoc.id));
      }
    });
  });
}

// Call cleanupOldChats periodically (e.g., once a day)
setInterval(cleanupOldChats, 24 * 60 * 60 * 1000);

// Other existing functions remain unchanged...

async function handleViolation(foundViolations) {
  const violationKey = violationStorageKeyPrefix + currentUser.uid;
  let violationDataRaw = localStorage.getItem(violationKey);
  let violationData = violationDataRaw ? JSON.parse(violationDataRaw) : { count: 0, reports: [] };

  violationData.count += 1;
  violationData.reports.push({
    timestamp: Date.now(),
    words: foundViolations
  });

  localStorage.setItem(violationKey, JSON.stringify(violationData));

  if (violationData.count === violationWarningLimit) {
    alert("Warning: Your message contains inappropriate content. Please adhere to community guidelines.");
    // Send admin report for warning
    await sendAdminReport(currentUser.uid, 'warning', `Inappropriate content detected: ${foundViolations.join(', ')}`, `User received warning for violation count: ${violationData.count}`);
  } else if (violationData.count === violationTempBlockLimit) {
    // Temporary 7-day block
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const blockData = { type: "temporary", expiresAt };
    localStorage.setItem(blockStorageKeyPrefix + currentUser.uid, JSON.stringify(blockData));
    alert("You have been temporarily blocked for 7 days due to misconduct. Your profile is hidden from families.");
    // Send admin report for temporary block
    await sendAdminReport(currentUser.uid, 'temporary_block', `Multiple violations detected: ${foundViolations.join(', ')}`, `User temporarily blocked for 7 days. Violation count: ${violationData.count}`);
  } else if (violationData.count >= violationPermanentBlockLimit) {
    // Permanent ban
    const blockData = { type: "permanent" };
    localStorage.setItem(blockStorageKeyPrefix + currentUser.uid, JSON.stringify(blockData));
    alert("You have been permanently banned due to repeated misconduct. Your profile is removed from search.");
    // Send admin report for permanent ban
    await sendAdminReport(currentUser.uid, 'permanent_ban', `Repeated violations detected: ${foundViolations.join(', ')}`, `User permanently banned. Violation count: ${violationData.count}`);
  }
}

// AI Activity Monitor
function loadActivityMonitor() {
  const activityStatus = document.getElementById('activityStatus');
  const activityIcon = document.getElementById('activityIcon');
  const activityText = document.getElementById('activityText');
  const statusIcon = document.getElementById('statusIcon');

  // Check block status
  const blockKey = blockStorageKeyPrefix + currentUser.uid;
  const blockDataRaw = localStorage.getItem(blockKey);
  const now = Date.now();

  if (blockDataRaw) {
    const blockData = JSON.parse(blockDataRaw);
    if (blockData.type === "temporary" && now < blockData.expiresAt) {
      activityStatus.className = 'activity-status status-warning';
      activityIcon.textContent = '⚠️';
      activityText.textContent = 'Account Status: Temporarily Blocked';
      if (statusIcon) statusIcon.textContent = '⚠️';
    } else if (blockData.type === "permanent") {
      activityStatus.className = 'activity-status status-danger';
      activityIcon.textContent = '🚫';
      activityText.textContent = 'Account Status: Permanently Banned';
      if (statusIcon) statusIcon.textContent = '🚫';
    } else {
      // Block expired
      activityStatus.className = 'activity-status status-good';
      activityIcon.textContent = '✅';
      activityText.textContent = 'Account Status: Good Standing';
      if (statusIcon) statusIcon.textContent = '✅';
    }
  } else {
    activityStatus.className = 'activity-status status-good';
    activityIcon.textContent = '✅';
    activityText.textContent = 'Account Status: Good Standing';
    if (statusIcon) statusIcon.textContent = '✅';
  }
}

// AI Bot Chat Helper
async function sendAdminReport(userId, actionType, reason, details) {
  try {
    await addDoc(collection(db, 'adminReports'), {
      userId,
      actionType,
      reason,
      details,
      timestamp: Timestamp.now()
    });
  } catch (error) {
    console.error('Failed to send admin report:', error);
  }
}

function initAIBot() {
  const aiBotInput = document.getElementById('aiBotInput');
  const aiBotSendBtn = document.getElementById('aiBotSendBtn');
  const aiBotMessages = document.getElementById('aiBotMessages');

  const aiResponses = {
    'help': 'I can help you with platform etiquette, finding matches, profile tips, and general guidance. What would you like to know?',
    'etiquette': 'Remember to be respectful, use appropriate language, and maintain Islamic values in all communications. Avoid sharing personal contact information until you\'re ready to proceed with Nikah.',
    'profile': 'Complete your profile fully to increase your chances of finding suitable matches. Include your education, occupation, and personal interests.',
    'matching': 'Our AI analyzes compatibility based on your preferences, values, and profile information to suggest the best matches.',
    'privacy': 'Your privacy is important. Never share personal contact details until you\'re ready to meet in person with family supervision.',
    'guidelines': 'Follow our community guidelines: be respectful, maintain modesty, and use the platform only for Nikah purposes.',
    'default': 'I\'m here to help! You can ask me about platform features, etiquette, matching tips, or general guidance.'
  };

  function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message';
    messageDiv.innerHTML = `<strong>${isUser ? 'You' : 'AI Helper'}:</strong> ${text}`;
    aiBotMessages.appendChild(messageDiv);
    aiBotMessages.scrollTop = aiBotMessages.scrollHeight;
  }

  function getAIResponse(message) {
    const lowerMessage = message.toLowerCase();
    for (const [key, response] of Object.entries(aiResponses)) {
      if (lowerMessage.includes(key)) {
        return response;
      }
    }
    return aiResponses.default;
  }

  aiBotSendBtn.addEventListener('click', () => {
    const message = aiBotInput.value.trim();
    if (!message) return;

    addMessage(message, true);
    aiBotInput.value = '';

    // Simulate AI response delay
    setTimeout(() => {
      const response = getAIResponse(message);
      addMessage(response);
    }, 1000);
  });

  aiBotInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      aiBotSendBtn.click();
    }
  });
}

// Language change function
function changeLanguage(lang) {
  // Simple translation for key elements
  const translations = {
    en: {
      dashboard: 'Dashboard',
      profile: 'Profile',
      messages: 'Messages',
      notifications: 'Notifications',
      settings: 'Settings',
      welcome: 'Welcome to your Dashboard',
      status: 'Account Status'
    },
    ur: {
      dashboard: 'ڈیش بورڈ',
      profile: 'پروفائل',
      messages: 'پیغامات',
      notifications: 'اطلاعات',
      settings: 'ترتیبات',
      welcome: 'آپ کے ڈیش بورڈ میں خوش آمدید',
      status: 'اکاؤنٹ کی حیثیت'
    },
    ar: {
      dashboard: 'لوحة التحكم',
      profile: 'الملف الشخصي',
      messages: 'الرسائل',
      notifications: 'الإشعارات',
      settings: 'الإعدادات',
      welcome: 'مرحبا بك في لوحة التحكم الخاصة بك',
      status: 'حالة الحساب'
    }
  };

  const t = translations[lang] || translations.en;

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const id = btn.id.split('-')[1];
    if (t[id]) btn.textContent = t[id];
  });

  // Update sidebar buttons
  const sidebarBtns = {
    'profileViewBtn': 'Browse Profile',
    'myProfileBtn': 'My Profile',
    'messagesBtn': 'Messages',
    'notificationsBtn': 'Notifications',
    'settingsBtn': 'Settings'
  };

  Object.keys(sidebarBtns).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      const key = sidebarBtns[id].toLowerCase();
      if (t[key]) btn.textContent = t[key];
    }
  });

  // Update welcome message
  const welcomeEl = document.querySelector('h1');
  if (welcomeEl && t.welcome) welcomeEl.textContent = t.welcome;

  // Update status text
  const statusEl = document.getElementById('activityText');
  if (statusEl && t.status) {
    const current = statusEl.textContent.split(':')[1];
    statusEl.textContent = `${t.status}: ${current}`;
  }

  // Store selected language
  localStorage.setItem('selectedLanguage', lang);

  // Use AI to assist with full translation if needed
  if (lang !== 'en') {
    // Simulate AI translation request
    setTimeout(() => {
      alert(`AI is assisting with ${lang} translation. Full page translation applied.`);
    }, 500);
  }
}

// Load saved language on page load
document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('selectedLanguage') || 'en';
  const langSelector = document.getElementById('languageSelector');
  if (langSelector) langSelector.value = savedLang;
  changeLanguage(savedLang);
});

// Event listeners
function setupEventListeners() {
  // Initialize AI Bot
  initAIBot();

  // Hamburger menu toggle
  document.getElementById('hamburgerBtn').addEventListener('click', () => {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
  });

  // Account status button
  document.getElementById('accountStatusBtn').addEventListener('click', () => {
    const blockKey = blockStorageKeyPrefix + currentUser.uid;
    const blockDataRaw = localStorage.getItem(blockKey);
    const now = Date.now();
    let statusMessage = 'Account Status: Good Standing\nContinue following community guidelines to maintain this status.';

    if (blockDataRaw) {
      const blockData = JSON.parse(blockDataRaw);
      if (blockData.type === "temporary" && now < blockData.expiresAt) {
        statusMessage = `Account Status: Temporarily Blocked\nYour account is temporarily blocked until ${new Date(blockData.expiresAt).toLocaleDateString()}.\nIf you repeat this mistake, you will be blocked permanently.`;
      } else if (blockData.type === "permanent") {
        statusMessage = 'Account Status: Permanently Banned\nYour account is permanently banned due to repeated misconduct.\nYour profile is removed from search.';
      }
    }

    alert(statusMessage);
  });

  // AI Bot toggle
  document.getElementById('aiBotToggleBtn').addEventListener('click', () => {
    const aiBotContainer = document.getElementById('aiBotContainer');
    aiBotContainer.classList.toggle('hidden');
  });

  // Sidebar button clicks to switch tabs or navigate
  document.getElementById('profileViewBtn').addEventListener('click', () => {
    // Browse Profile - go to profile view page
    window.location.href = 'profile-view.html'; // Assuming profile view page
  });

  document.getElementById('myProfileBtn').addEventListener('click', () => {
    // Go to Profile - go to profile submission page
    window.location.href = 'profile.html'; // Assuming profile submission page
  });

  document.getElementById('messagesBtn').addEventListener('click', () => {
    document.getElementById('tab-messages').click();
  });

  document.getElementById('notificationsBtn').addEventListener('click', () => {
    document.getElementById('tab-notifications').click();
  });

  document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('tab-settings').click();
  });

  // Notification bell button (assuming it's added to HTML)
  const notificationBellBtn = document.getElementById('notificationBellBtn');
  if (notificationBellBtn) {
    notificationBellBtn.addEventListener('click', () => {
      document.getElementById('tab-notifications').click();
    });
  }

  // Language selector
  const languageSelector = document.getElementById('languageSelector');
  if (languageSelector) {
    languageSelector.addEventListener('change', (e) => {
      const selectedLang = e.target.value;
      changeLanguage(selectedLang);
    });
  }

  // Enable messaging inputs and functionality
  document.getElementById('sendMessageBtn').disabled = false;
  document.getElementById('voiceRecordBtn').disabled = false;
  document.getElementById('messageInput').disabled = false;
  document.getElementById('messageInput').placeholder = 'Type your message here...';

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      btn.classList.add('tab-active');
      document.getElementById('content-' + btn.id.split('-')[1]).classList.remove('hidden');
    });
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });

  // Send message
  document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
  document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Password change
  document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    try {
      // Note: Firebase doesn't have a direct way to verify current password
      // In a real app, you'd need to re-authenticate
      await updatePassword(currentUser, newPassword);
      alert('Password updated successfully');
      document.getElementById('passwordForm').reset();
    } catch (error) {
      alert('Error updating password: ' + error.message);
    }
  });

  // Privacy settings
  document.getElementById('savePrivacyBtn').addEventListener('click', async () => {
    const profileVisible = document.getElementById('profileVisible').checked;
    const showOnlineStatus = document.getElementById('showOnlineStatus').checked;

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        profileVisible,
        showOnlineStatus
      });
      alert('Settings saved successfully');
    } catch (error) {
      alert('Error saving settings: ' + error.message);
    }
  });
}

// Admin notification function (for admin use)
window.sendAdminNotification = async (userId, title, message) => {
  await addDoc(collection(db, 'notifications'), {
    userId,
    title,
    message,
    timestamp: Timestamp.now(),
    type: 'admin'
  });
};

// Admin override functions
window.adminBlockUser = async (userId, blockType, reason) => {
  const blockKey = blockStorageKeyPrefix + userId;
  let blockData;

  if (blockType === 'temporary') {
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    blockData = { type: "temporary", expiresAt };
  } else if (blockType === 'permanent') {
    blockData = { type: "permanent" };
  } else {
    console.error('Invalid block type');
    return;
  }

  localStorage.setItem(blockKey, JSON.stringify(blockData));

  // Send admin report
  await sendAdminReport(userId, `admin_${blockType}_block`, `Admin manual ${blockType} block`, `Reason: ${reason}`);

  // Send notification to user
  await sendAdminNotification(userId, 'Account Status Update', `Your account has been ${blockType}ly blocked by an administrator. Reason: ${reason}`);

  console.log(`User ${userId} has been ${blockType}ly blocked by admin`);
};

window.adminUnblockUser = async (userId, reason) => {
  const blockKey = blockStorageKeyPrefix + userId;
  localStorage.removeItem(blockKey);

  // Send admin report
  await sendAdminReport(userId, 'admin_unblock', 'Admin manual unblock', `Reason: ${reason}`);

  // Send notification to user
  await sendAdminNotification(userId, 'Account Status Update', `Your account has been unblocked by an administrator. Reason: ${reason}`);

  console.log(`User ${userId} has been unblocked by admin`);
};

// Function to get all admin reports (for admin dashboard)
window.getAdminReports = async () => {
  const q = query(collection(db, 'adminReports'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  const reports = [];
  snapshot.forEach((doc) => {
    reports.push({ id: doc.id, ...doc.data() });
  });
  return reports;
};
