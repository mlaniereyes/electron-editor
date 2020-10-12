const marked = require('marked');
const { remote, ipcRenderer, shell } = require('electron');
const mainProcess = remote.require('./main');
const currentWindow = remote.getCurrentWindow();
const path = require('path');
let filePath = null;
let originalContent = '';

const markdownView = document.querySelector('#markdown');
const htmlView = document.querySelector('#html');
const newFileButton = document.querySelector('#new-file');
const openFileButton = document.querySelector('#open-file');
const saveMarkdownButton = document.querySelector('#save-markdown');
const revertButton = document.querySelector('#revert');
const saveHtmlButton = document.querySelector('#save-html');
const showFileButton = document.querySelector('#show-file');
const openInDefaultButton = document.querySelector('#open-in-default');

const renderFile = (file, content) => {
  markdownView.value = content;
  renderMarkdownToHtml(content);
};


const renderMarkdownToHtml = markdown => {
  htmlView.innerHTML = marked(markdown, { sanitize: true });
};

markdownView.addEventListener('keyup', event => {
  const currentContent = event.target.value;
  renderMarkdownToHtml(currentContent);

  updateUserInterface(currentContent !== originalContent);
});

const updateUserInterface = (isEdited) => {
  let title = 'Markdown Editor';
  if (filePath) {
    title = `${path.basename(filePath)} - ${title}`;
  }

  if (isEdited) {
    title = `${title} - [Edited]`
  }


  saveMarkdownButton.disabled = !isEdited;
  revertButton.disabled = !isEdited;

  showFileButton.disabled = !filePath;
  openInDefaultButton.disabled = !filePath;

  currentWindow.setTitle(title);
  if (filePath) currentWindow.setRepresentedFilename(filePath);
  currentWindow.setDocumentEdited(isEdited);
}

openFileButton.addEventListener('click', () => {
  mainProcess.getFileFromUser();
});

showFileButton.addEventListener('click', () => {
  if (!filePath) return;
  shell.showItemInFolder(filePath);
});

openInDefaultButton.addEventListener('click', () => {
  if (!filePath) return;
  
  shell.openItem(filePath);
})

const saveMarkdown = () => {
  mainProcess.saveMarkdown(filePath, markdownView.value);
}

saveMarkdownButton.addEventListener('click', () => {
  saveMarkdown();
});

const saveHTML = () => {
  mainProcess.saveHtml(markdownView.value);
}
saveHtmlButton.addEventListener('click', () => {
  saveHTML();
});

ipcRenderer.on('save-html', saveHTML);
ipcRenderer.on('save-markdown', saveMarkdown);

document.addEventListener('dragstart', event => event.preventDefault());
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragleave', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());

const getDraggedFile = (event) => event.dataTransfer.items[0];
const getDroppedFile = (event) =>  event.dataTransfer.files[0];
const fileTypeIsSupported = (file) => {
  return ['text/plain', 'text/markdown', 'text/md'].includes(file.type);
};

markdownView.addEventListener('dragOver', (event) => {
  const file = getDraggedFile(event);

  if (fileTypeIsSupported(file)) {
    markdownView.classList.add('drag-over');
  } else {
    markdownView.classList.add('drag-error');
  }
});

markdownView.addEventListener('dragleave', () => {
  markdownView.classList.remove('drag-over');
  markdownView.classList.remove('drag-error');
});

markdownView.addEventListener('drop', (event) => {
  const file = getDroppedFile(event);

  if (fileTypeIsSupported(file)) {
    mainProcess.openFile(file.path);
  } else {
    alert('that file is not supported')
  }
  markdownView.classList.remove('drag-over');
  markdownView.classList.remove('drag-error');

})

ipcRenderer.on('file-opened', (event, file, content) => {
  filePath = file;
  originalContent = content;
  updateUserInterface(false);
  renderFile(file, content);
})