document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const filenameSpan = document.getElementById('filename');
    const removeFileBtn = document.getElementById('remove-file');
    const controls = document.getElementById('controls');
    const formatSelect = document.getElementById('format-select');
    const convertBtn = document.getElementById('convert-btn');
    const statusMessage = document.getElementById('status-message');
    const loader = document.getElementById('loader');
    const btnText = convertBtn.querySelector('span');
    const btnIcon = convertBtn.querySelector('i');

    let currentFiles = [];

    // Supported conversions
    const conversionMap = {
        'csv': ['xlsx', 'json', 'parquet', 'txt'],
        'xlsx': ['csv', 'json', 'parquet', 'txt'],
        'json': ['csv', 'xlsx', 'parquet', 'txt'],
        'parquet': ['csv', 'xlsx', 'json', 'txt'],
        'avro': ['csv', 'xlsx', 'json', 'txt'],
        'txt': ['csv'] // Basic support
    };

    // Drag & Drop Handling
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });

    removeFileBtn.addEventListener('click', () => {
        resetState();
    });

    function handleFiles(files) {
        currentFiles = Array.from(files);

        if (currentFiles.length === 1) {
            filenameSpan.textContent = currentFiles[0].name;
        } else {
            filenameSpan.textContent = `${currentFiles.length} files selected`;
        }

        // Show file info, hide drag prompt
        dropZone.querySelector('.icon-container').style.display = 'none';
        dropZone.querySelector('h3').style.display = 'none';
        dropZone.querySelector('p').style.display = 'none';
        dropZone.querySelector('.browse-btn').style.display = 'none';

        fileInfo.style.display = 'flex';

        // Update options based on FIRST file (assuming homogeneous batch or primary file type)
        updateFormatOptions(currentFiles[0].name);

        // Enable controls
        controls.style.opacity = '1';
        controls.style.pointerEvents = 'all';
    }

    function resetState() {
        currentFiles = [];
        fileInput.value = '';

        dropZone.querySelector('.icon-container').style.display = 'block';
        dropZone.querySelector('h3').style.display = 'block';
        dropZone.querySelector('p').style.display = 'block';
        dropZone.querySelector('.browse-btn').style.display = 'inline-block';

        fileInfo.style.display = 'none';

        controls.style.opacity = '0.5';
        controls.style.pointerEvents = 'none';
        formatSelect.innerHTML = '<option value="" disabled selected>Select Format</option>';
        statusMessage.textContent = '';
        statusMessage.style.color = 'inherit';
    }

    function updateFormatOptions(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        formatSelect.innerHTML = '<option value="" disabled selected>Select Format</option>';

        const options = conversionMap[ext] || [];

        if (options.length === 0) {
            const opt = document.createElement('option');
            opt.disabled = true;
            opt.textContent = "No valid conversions for this file type";
            formatSelect.appendChild(opt);
            return;
        }

        options.forEach(fmt => {
            const opt = document.createElement('option');
            opt.value = fmt;
            opt.textContent = fmt.toUpperCase();
            formatSelect.appendChild(opt);
        });
    }

    convertBtn.addEventListener('click', async () => {
        if (currentFiles.length === 0 || !formatSelect.value) return;

        // UI Loading State
        btnText.style.display = 'none';
        btnIcon.style.display = 'none';
        loader.style.display = 'block';
        convertBtn.disabled = true;
        statusMessage.textContent = 'Processing...';
        statusMessage.style.color = '#00c6ff';

        const formData = new FormData();
        currentFiles.forEach(file => {
            formData.append('file', file);
        });
        formData.append('format', formatSelect.value);

        try {
            const response = await fetch('/convert', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Conversion failed');
            }

            // Handle Download
            const blob = await response.blob();

            // Get suggested filename from header or construct
            const contentDisposition = response.headers.get('Content-Disposition');
            let fileName = 'converted_result.' + formatSelect.value;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) fileName = match[1];
            } else if (currentFiles.length === 1) {
                fileName = currentFiles[0].name.split('.')[0] + '.' + formatSelect.value;
            }

            // Save File Picker API
            try {
                if (window.showSaveFilePicker) {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: fileName,
                        types: [{
                            description: formatSelect.value.toUpperCase() + ' File',
                            accept: { ['application/' + formatSelect.value]: ['.' + formatSelect.value] },
                        }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                } else {
                    throw new Error("File Picker not supported");
                }
            } catch (pickerError) {
                // Fallback to classic download
                console.log("File Picker failed or canceled, falling back to auto-download", pickerError);
                if (pickerError.name !== 'AbortError') {
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                }
            }

            statusMessage.textContent = 'Conversion Successful!';
            statusMessage.style.color = '#00ff88';

        } catch (error) {
            console.error(error);
            statusMessage.textContent = 'Error: ' + error.message;
            statusMessage.style.color = '#ff4757';
        } finally {
            // Reset Button
            btnText.style.display = 'inline';
            btnIcon.style.display = 'inline';
            loader.style.display = 'none';
            convertBtn.disabled = false;
        }
    });
});
