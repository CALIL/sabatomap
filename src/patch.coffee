link = document.createElement('link')
link.setAttribute 'rel', 'stylesheet'
link.setAttribute 'type', 'text/css'
link.setAttribute 'href', 'https://calil.jp/static/apps/sabatomap/v100/app.css'
head = document.getElementsByTagName('head')[0]
head.appendChild link
initializeApp()