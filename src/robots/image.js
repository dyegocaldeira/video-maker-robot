const state = require('./state');
const google = require('googleapis').google;
const customSearch = google.customsearch('v1');
const googleSearchCredential = require('../credentials/video-maker-robot-2228d3fb6c77.json');
const imageDownloader = require('image-downloader');

async function robot() {

    const content = state.load();

    await fetchImagesOfAllSentences(content);
    await downloadAllImages(content);

    state.save(content);

    async function fetchImagesOfAllSentences(content) {

        for (const sentence of content.sentences) {

            const query = `${content.searchTerm} ${sentence.keywords[0]}`;

            sentence.images = await fetchGoogleAndReturnImagesLinks(query);
            sentence.googleSearchQuery = query;
        }
    };

    async function fetchGoogleAndReturnImagesLinks(query) {

        const response = await customSearch.cse.list({
            auth: googleSearchCredential.apiKey,
            cx: googleSearchCredential.searchEngineId,
            q: query,
            searchType: 'image',
            num: 3
        });

        const imagesUrl = response.data.items.map(item => item.link);

        return imagesUrl;
    };

    async function downloadAllImages(content) {

        content.downloadedImages = [];

        for (const [sentenceIndex, sentence] of content.sentences.entries()) {

            for (const [imageIndex, imageUrl] of sentence.images.entries()) {
                // for (let imageIndex = 0; imageIndex < 2; imageIndex++) {

                // const imageUrl = sentence.images[imageIndex];

                try {

                    if (content.downloadedImages.includes(imageUrl)) {

                        throw new Error('Image already downloaded');
                    }

                    const ext = null// /\.([^./]+)$/.exec(imageUrl);

                    await downloadImageAndSave(imageUrl, `${sentenceIndex}-original${ext ? ext[0] : '.png'}`);

                    content.downloadedImages.push(imageUrl);

                    console.log(`> [image-robot] [${sentenceIndex}] [${imageIndex}] Image successfully downloaded: ${imageUrl}`);
                } catch (err) {

                    console.log(`> [image-robot] [${sentenceIndex}] [${imageIndex}] Error ${imageUrl}: ${err}`);
                }
            }
        }
    }

    async function downloadImageAndSave(url, fileName) {

        return imageDownloader.image({
            url,
            dest: `./content/${fileName}`
        });
    }

}

module.exports = robot;