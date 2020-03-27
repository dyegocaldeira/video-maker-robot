const Algorithmia = require('algorithmia');
const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey;
const sentenceDetection = require('sbd');
const watsonCredentials = require('../credentials/watson-nlu.json');
const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1.js')
const { IamAuthenticator } = require('ibm-watson/auth');

const nlu = new NaturalLanguageUnderstandingV1({
    version: '2019-07-12',
    authenticator: new IamAuthenticator({
        apikey: watsonCredentials.apiKey,
    }),
    url: watsonCredentials.url
})

const state = require('./state.js');

async function robot() {

    const content = state.load();

    await fetchContentFromWikipedia(content);
    sanitizeContent(content);
    breakContentIntoSentences(content);
    limitMaximumSentences(content);
    await fetchKeywordsOfAllSentences(content);

    state.save(content);

    async function fetchContentFromWikipedia(content) {

        const algorithmiaAuthenticated = Algorithmia.client(algorithmiaApiKey);
        const wikipediaAlgorithm = algorithmiaAuthenticated.algo('web/WikipediaParser/0.1.2');
        const wikipediaResponse = await wikipediaAlgorithm.pipe({
            articleName: content.searchTerm,
            lang: 'pt'
        });
        const wikipediaContent = wikipediaResponse.get();

        content.sourceContentOriginal = wikipediaContent.content;
    }

    function sanitizeContent(content) {

        const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(content.sourceContentOriginal)
        const withoutDatesInParentheses = removeDatesInParentheses(withoutBlankLinesAndMarkdown);

        content.sourceContentSanitized = withoutDatesInParentheses;

        function removeBlankLinesAndMarkdown(text) {

            const allLines = text.split('\n');
            const withoutBlankLinesAndMarkdown = allLines.filter(line => {

                if (!line.trim().length || line.trim().startsWith('=')) {

                    return false;
                }

                return true;
            })

            return withoutBlankLinesAndMarkdown.join(' ');
        }
    }

    function removeDatesInParentheses(text) {

        return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g, ' ')
    }

    function breakContentIntoSentences(content) {

        content.sentences = []

        const sentences = sentenceDetection.sentences(content.sourceContentSanitized)

        sentences.forEach(sentence => {
            content.sentences.push({
                text: sentence,
                keywords: [],
                images: []
            })
        })
    }

    function limitMaximumSentences(content) {

        content.sentences = content.sentences.slice(0, content.maximumSentences)
    }

    async function fetchKeywordsOfAllSentences(content) {

        console.log('> [text-robot] Starting to fetch keywords from Watson')

        for (const sentence of content.sentences) {

            console.log(`> [text-robot] Sentence: "${sentence.text}"`)

            sentence.keywords = await fetchWatsonAndReturnKeywords(sentence.text)

            console.log(`> [text-robot] Keywords: ${sentence.keywords.join(', ')}\n`)
        }
    }

    async function fetchWatsonAndReturnKeywords(sentence) {

        const analyzeParams = {
            text: sentence,
            features: {
                keywords: {}
            }
        };

        const analysisResults = await nlu.analyze(analyzeParams);

        const keywords = analysisResults.result.keywords.map(keyword => keyword.text);

        return keywords;
    }
}

module.exports = robot