var head, link;

link = document.createElement('link');

link.setAttribute('rel', 'stylesheet');

link.setAttribute('type', 'text/css');

link.setAttribute('href', '__CSS__');

head = document.getElementsByTagName('head')[0];

head.appendChild(link);

app.initializeApp();
