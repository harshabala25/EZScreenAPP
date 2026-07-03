// -------------------------
// IMPORT FIREBASE
// -------------------------
import { db, auth } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// ------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------
const N8N_SUMMARY_URL = "https://ezscreen.app.n8n.cloud/webhook/pdf-summary";
const N8N_QA_URL = "https://ezscreen.app.n8n.cloud/webhook/pdf-qa-text";
const N8N_EMAIL_SUMMARY_URL = "https://ezscreen.app.n8n.cloud/webhook/ezscreen-summary"; // NEW

let pdfTextContent = ""; // Store extracted PDF text
let pdfFileName = ""; // Store PDF filename

// ------------------------------------------------------
// PAGE SWITCHING
// ------------------------------------------------------
function showPage(pageId) {
    document.querySelectorAll('.phone').forEach(page => {
        page.classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');
}

// ------------------------------------------------------
// LOGIN WITH FIREBASE
// ------------------------------------------------------
function login() {
    const email = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        alert("Please enter email and password");
        return;
    }

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            alert("Logged in!");
        })
        .catch((error) => {
            alert(error.message);
        });
}

// ------------------------------------------------------
// SIGNUP WITH FIREBASE
// ------------------------------------------------------
function signup() {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;

    if (!name || !email || !password || !confirm) {
        alert("Please fill in all fields.");
        return;
    }

    if (password !== confirm) {
        alert("Passwords do not match.");
        return;
    }

    createUserWithEmailAndPassword(auth, email, password)
        .then(() => {
            alert("Account created!");
        })
        .catch((error) => {
            alert(error.message);
        });
}

// ------------------------------------------------------
// PASSWORD RESET
// ------------------------------------------------------
function resetPassword() {
    const input = document.getElementById('forgotInput').value;
    if (!input) {
        alert("Please enter your email.");
        return;
    }

    alert("Password reset link sent! (UI only)");
    showPage("loginPage");
}

// ------------------------------------------------------
// LOGOUT
// ------------------------------------------------------
function logout() {
    if (!auth) {
        console.error("Auth not initialized");
        alert("Authentication error. Please refresh the page.");
        return;
    }
   
    auth.signOut()
        .then(() => {
            showPage("loginPage");
        })
        .catch((error) => {
            alert("Error logging out: " + error.message);
        });
}

// ------------------------------------------------------
// SUMMARY OPTION SELECT
// ------------------------------------------------------
function updateChoice() {
    const type = document.getElementById('contentType').value;
    if (type === 'email') showPage('summaryPage');
    if (type === 'pdf') showPage('uploadPDFPage');
    if (type === 'question') showPage('uploadQuestionPDFPage');
}

// ------------------------------------------------------
// FILE UPLOAD PREVIEWS
// ------------------------------------------------------
function handleFileUpload() {
    const file = document.getElementById('fileInput').files[0];
    if (file) {
        document.querySelector('#uploadPDFPage .upload-text').textContent = file.name;
    }
}

function handleQuestionFileUpload() {
    const file = document.getElementById('questionFileInput').files[0];
    if (file) {
        document.querySelector('#uploadQuestionPDFPage .upload-text').textContent = file.name;
    }
}

// ------------------------------------------------------
// EXTRACT TEXT FROM PDF USING PDF.JS
// ------------------------------------------------------
async function extractTextFromPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
       
        let fullText = '';
       
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }
       
        return fullText;
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

// ------------------------------------------------------
// UPLOAD FILE FOR SUMMARY (STILL SENDS FULL PDF)
// ------------------------------------------------------
async function uploadFile() {
    const file = document.getElementById('fileInput').files[0];

    if (!file) {
        alert("Please select a file first!");
        return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
        alert("Please upload a PDF file only.");
        return;
    }

    showPage("summaryResultPage");

    const container = document.getElementById("summaryContainer");
    container.innerHTML = `
        <div class="message user">
            <div class="message-bubble">📄 ${file.name}</div>
        </div>
        <div class="message">
            <div class="avatar">EZ</div>
            <div class="message-bubble">Processing your PDF... please wait ⏳</div>
        </div>
    `;

    try {
        const formData = new FormData();
        formData.append("data", file);

        const response = await fetch(N8N_SUMMARY_URL, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        
        const summary = data.summary || "Error: No summary returned.";

        container.innerHTML = `
            <div class="message user">
                <div class="message-bubble">📄 ${file.name}</div>
            </div>

            <div class="message">
                <div class="avatar">EZ</div>
                <div class="message-bubble">
                    <strong>Summary:</strong><br><br>
                    ${summary.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;

    } catch (err) {
        console.error("Upload error:", err);
        container.innerHTML += `
            <div class="message">
                <div class="avatar">EZ</div>
                <div class="message-bubble" style="color: #d32f2f;">
                    ❌ Error: Failed to process PDF. Please try again.<br>
                    <small>${err.message}</small>
                </div>
            </div>
        `;
    }
}

// ------------------------------------------------------
// UPLOAD FILE FOR Q&A - EXTRACT TEXT ONCE
// ------------------------------------------------------
async function uploadQuestionFile() {
    const file = document.getElementById('questionFileInput').files[0];

    if (!file) {
        alert("Please select a file first!");
        return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
        alert("Please upload a PDF file only.");
        return;
    }

    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.textContent = "Extracting text from PDF...";

    try {
        pdfTextContent = await extractTextFromPDF(file);
        pdfFileName = file.name;


        showPage("chatPage");

        const container = document.getElementById("chatContainer");
        container.innerHTML = `
            <div class="message">
                <div class="avatar">EZ</div>
                <div class="message-bubble">📄 ${file.name} is ready! I've extracted the text. Ask me anything!</div>
            </div>
        `;

        statusDiv.textContent = "";

    } catch (error) {
        console.error("PDF extraction error:", error);
        statusDiv.textContent = "Error extracting PDF text";
        alert("Failed to extract text from PDF. Please try another file.");
    }
}

// ------------------------------------------------------
// ASK QUESTION - ONLY SENDS TEXT + QUESTION (FAST!)
// ------------------------------------------------------
async function askQuestion() {
    const questionInput = document.getElementById('questionInput');
    const question = questionInput.value.trim();

    if (!question) {
        return;
    }

    if (!pdfTextContent) {
        alert("Please upload a PDF first!");
        return;
    }

    const container = document.getElementById("chatContainer");
   
    container.innerHTML += `
        <div class="message user">
            <div class="message-bubble">${question}</div>
        </div>
        <div class="message">
            <div class="avatar">EZ</div>
            <div class="message-bubble">Thinking... ⏳</div>
        </div>
    `;

    questionInput.value = '';

    container.scrollTop = container.scrollHeight;

    try {
        const response = await fetch(N8N_QA_URL, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: pdfTextContent,
                question: question,
                filename: pdfFileName
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
       
        const answer = data.answer || "I couldn't find an answer to that question.";

        const messages = container.querySelectorAll('.message');
        const lastMessage = messages[messages.length - 1];
        lastMessage.querySelector('.message-bubble').innerHTML = answer.replace(/\n/g, '<br>');

        container.scrollTop = container.scrollHeight;

    } catch (err) {
        console.error("Question error:", err);
        const messages = container.querySelectorAll('.message');
        const lastMessage = messages[messages.length - 1];
        lastMessage.querySelector('.message-bubble').innerHTML = `
            ❌ Error: Failed to get answer. Please try again.<br>
            <small>${err.message}</small>
        `;
        container.scrollTop = container.scrollHeight;
    }
}

// ------------------------------------------------------
// SUBMIT EMAIL SUMMARY - NOW CONNECTS TO N8N
// ------------------------------------------------------
async function submitSummary() {
    const text = document.getElementById('summaryText').innerText;

    if (!text.trim()) {
        alert("Please paste your email content first.");
        return;
    }

    showPage("summaryResultPage");

    const container = document.getElementById("summaryContainer");
    container.innerHTML = `
        <div class="message user">
            <div class="message-bubble">${text.substring(0, 200)}${text.length > 200 ? '...' : ''}</div>
        </div>

        <div class="message">
            <div class="avatar">EZ</div>
            <div class="message-bubble">Processing your email... please wait ⏳</div>
        </div>
    `;

    try {
        const response = await fetch(N8N_EMAIL_SUMMARY_URL, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                emailText: text
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
       
        const summary = data.summary || data.result || data.output || data.message || "Error: No summary returned.";

        container.innerHTML = `
            <div class="message user">
                <div class="message-bubble">${text.substring(0, 200)}${text.length > 200 ? '...' : ''}</div>
            </div>

            <div class="message">
                <div class="avatar">EZ</div>
                <div class="message-bubble">
                    <strong>Summary:</strong><br><br>
                    ${summary.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;

    } catch (err) {
        console.error("Email summary error:", err);
        container.innerHTML += `
            <div class="message">
                <div class="avatar">EZ</div>
                <div class="message-bubble" style="color: #d32f2f;">
                    ❌ Error: Failed to process email. Please try again.<br>
                    <small>${err.message}</small>
                </div>
            </div>
        `;
    }
}


// ------------------------------------------------------
// AUTH LISTENER - REDIRECT TO HOME WHEN LOGGED IN
// ------------------------------------------------------
onAuthStateChanged(auth, (user) => {
    if (user) {
        showPage("summarizeChoicePage");
    } else {
        showPage("loginPage");
    }
});

// ------------------------------------------------------
// EVENT LISTENERS
// ------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    const questionInput = document.getElementById('questionInput');
    if (questionInput) {
        questionInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                askQuestion();
            }
        });
    }

    const summaryText = document.getElementById('summaryText');
    const currentWords = document.getElementById('currentWords');
    if (summaryText && currentWords) {
        summaryText.addEventListener('input', () => {
            const text = summaryText.innerText || "";
            const words = text.trim().split(/\s+/).filter(word => word.length > 0);
            currentWords.textContent = words.length;
        });
    }
});

// ------------------------------------------------------
// EXPOSE FUNCTIONS TO BROWSER (for onclick handlers)
// ------------------------------------------------------
window.login = login;
window.signup = signup;
window.resetPassword = resetPassword;
window.logout = logout;
window.updateChoice = updateChoice;
window.handleFileUpload = handleFileUpload;
window.handleQuestionFileUpload = handleQuestionFileUpload;
window.uploadFile = uploadFile;
window.uploadQuestionFile = uploadQuestionFile;
window.submitSummary = submitSummary;
window.askQuestion = askQuestion;
window.showPage = showPage;
