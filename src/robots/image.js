const state = require('./state');
const google = require('googleapis').google;
const customSearch = google.customsearch('v1');
const googleSearchCredential = require('../credentials/video-maker-robot-2228d3fb6c77.json');
const imageDownloader = require('image-downloader');

async function robot() {

    console.log(`> [Image-robot] Starting ...`);

    const content = state.load();

    await fetchImagesOfAllSentences(content);
    await downloadAllImages(content);

    state.save(content);

    async function fetchImagesOfAllSentences(content) {

        for (const [sentenceIndex, sentence] of content.sentences.entries()) {

            let query;

            if (!sentenceIndex) {

                query = `${content.searchTerm}`;
            } else {

                query = `${content.searchTerm} ${sentence.keywords[0]}`;
            }

            console.log(`> [Image-robot] Querying Google Images with: ${query}`);

            sentence.images = await fetchGoogleAndReturnImagesLinks(content, query);
            sentence.googleSearchQuery = query;
        }
    };

    async function fetchGoogleAndReturnImagesLinks(content, query) {

        const response = await customSearch.cse.list({
            auth: googleSearchCredential.apiKey,
            cx: googleSearchCredential.searchEngineId,
            q: query,
            // exactTerms: query,
            // hq: query,
            searchType: 'image',
            num: 5,
            // imgSize: 'large',
            imgType: content.typeImg,
            fields: 'items(link)'
        });

        const { data } = response || {};

        const imagesUrl = (data.items || []).map(item => item.link);

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

                    await downloadImageAndSave(content, imageUrl, `${sentenceIndex}-original.png`);

                    content.downloadedImages.push(imageUrl);

                    console.log(`> [image-robot] [${sentenceIndex}] [${imageIndex}] Image successfully downloaded: ${imageUrl}`);

                    break;
                } catch (err) {

                    console.log(`> [image-robot] [${sentenceIndex}] [${imageIndex}] Error ${imageUrl}: ${err}`);
                }
            }
        }
    }

    async function downloadImageAndSave(content, url, fileName) {

        return imageDownloader.image({
            url,
            dest: `./content/${content.searchTerm}/${fileName}`
        });
    }

}

module.exports = robot;