const state = require('./state');
const google = require('googleapis').google;
const customSearch = google.customsearch('v1');
const googleSearchCredential = require('../credentials/video-maker-robot-2228d3fb6c77.json');

async function robot() {

    const content = state.load();

    await fetchImagesOfAllSentences(content);

    state.save(content);

    async function fetchImagesOfAllSentences(content){

        for (const sentence of content.sentences) {
            
            const query = `${content.searchTerm} ${sentence.keywords[0]}`;

            sentence.images = await fetchGoogleAndReturnImagesLinks(query);
            sentence.googleSearchQuery = query;
        }
    };

    console.dir(content, { depth: null });

    async function fetchGoogleAndReturnImagesLinks(query) {

        const response = await customSearch.cse.list({
            auth: googleSearchCredential.apiKey,
            cx: googleSearchCredential.searchEngineId,
            q: query,
            searchType: 'image',
            run: 2
        });

        const imagesUrl = response.data.items.map(item => item.link);

        return imagesUrl;
    };
}

module.exports = robot;