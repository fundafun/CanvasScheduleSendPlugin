
document.getElementById('uploadForm').addEventListener('submit', function (e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('fileInput');
    const scheduleTime = document.getElementById('scheduleTime').value;
    const file = fileInput.files[0];
    
    if (!file || !scheduleTime) {
        alert('Please select a file and schedule time.');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('scheduleTime', scheduleTime);
    
    const progressBar = document.getElementById('progress-bar');
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload', true);
    
    xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
            progressBar.value = (e.loaded / e.total) * 100;
        }
    };
    
    xhr.onload = function () {
        if (xhr.status === 200) {
            alert('File uploaded successfully!');
        } else {
            alert('Error uploading file');
        }
    };
    
    xhr.send(formData);
});
    