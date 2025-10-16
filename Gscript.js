// Load user data
document.addEventListener('DOMContentLoaded', function() {
    const userData = JSON.parse(localStorage.getItem('allura_user_data') || '{}');
    const userName = userData.youtube || userData.instagram || '@gamer';

    document.getElementById('user-name').textContent = userName;
    document.getElementById('user-avatar').textContent = userName.replace('@', '').charAt(0).toUpperCase();
});

// File upload functionality
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    for (let file of files) {
        if (file.type.startsWith('video/')) {
            alert(`Uploaded: ${file.name}\nSize: ${(file.size / 1024 / 1024).toFixed(2)}MB\n\nFile would be processed and added to timeline.`);
        }
    }
}

// Tool selection
document.querySelectorAll('.tool-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.tool-item').forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        const toolName = this.querySelector('.tool-label').textContent;
        console.log(`Selected tool: ${toolName}`);
    });
});

// Property panel interactions
document.querySelectorAll('.property-item').forEach(item => {
    item.addEventListener('click', function() {
        const propertyName = this.querySelector('.property-name').textContent;
        alert(`Opening ${propertyName}...\nThis would open the specific tool interface.`);
    });
});