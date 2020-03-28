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

    // console.dir(content.sentence, { depth: null });

    async function fetchGoogleAndReturnImagesLinks(query) {

        const response = await customSearch.cse.list({
            auth: googleSearchCredential.apiKey,
            cx: googleSearchCredential.searchEngineId,
            q: query,
            searchType: 'image',
            num: 2
        });

        const imagesUrl = response.data.items.map(item => item.link);

        return imagesUrl;
    };

    async function downloadAllImages(content) {

        content.downloadedImages = [];

        for (const [sentenceIndex, sentence] of content.sentences.entries()) {

            for (const [imageindex, imageUrl] of sentence.images.entries()) {
                // for (let imageindex = 0; imageindex < 2; imageindex++) {

                // const imageUrl = sentence.images[imageindex];

                try {

                    if (content.downloadedImages.includes(imageUrl)) {

                        throw new Error('Image already downloaded');
                    }

                    await downloadImageAndSave(imageUrl, `${sentenceIndex}-${imageindex}-original.jpeg`);

                    content.downloadedImages.push(imageUrl);

                    console.log(`> [image-robot] [${sentenceIndex}] [${imageindex}] Image successfully downloaded: ${imageUrl}`);
                } catch (err) {

                    console.log(`> [image-robot] [${sentenceIndex}] [${imageindex}] Error ${imageUrl}: ${err}`);
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