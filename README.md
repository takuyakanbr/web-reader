# Web Reader

Node-Webkit based RSS reader.

![Screenshot](https://s-takuya.rhcloud.com/f/7yrLznvWec/web_reader_ss.PNG)

## Features
- Manage your RSS feeds.
- Pull feeds automatically every hour (there is a manual refresh button).
- Scrape articles off webpages directly and automatically.
- Stores whether you have read each article.
- All data stored locally (in `%LOCALAPPDATA%\web-reader`).

## Running

1. Make sure you have [Node.js](http://www.nodejs.org/) installed.
2. Clone the repository.
3. Use `npm install` in the root directory of the repository.
4. Download [Node-Webkit](https://github.com/rogerwang/node-webkit#downloads) and place it in the root folder of the repository.
5. Run the application using `nw.exe` from node-webkit.

## License

(C) Copyright 2014 Daniel Teo

This work is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License.