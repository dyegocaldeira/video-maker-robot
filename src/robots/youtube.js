const state = require('./state');
const google = require('googleapis').google;
const youtube = google.youtube({ version: 'v3' });
const OAuth2 = google.auth.OAuth2;
const express = require('express');
const fs = require('fs');

async function robot() {

    const content = state.load();

    await authenticationWithOAuth();
    const videoInformation = await uploadVideo(content);
    await uploadThumbnail(videoInformation);

    async function authenticationWithOAuth() {

        const webServer = await startWebServer();
        const OAuthClient = await createOAuthClient();
        requestUserConsent();
        const authorizationToken = await waitForGoogleCallback();
        await requestGoogleForAccessTokens(OAuthClient, authorizationToken);
        setGlobalGoogleAthentication(OAuthClient);
        await stopWebServer(webServer);

        async function startWebServer() {

            return new Promise((resolve, reject) => {

                const port = 5000;
                const app = express();

                const server = app.listen(port, () => {

                    console.log(`> Listening on http://localhost:${port}`);

                    resolve({
                        app,
                        server
                    })
                });
            });
        }

        async function createOAuthClient() {

            const credential = require('../credentials/client_secret_677170794300-68mkad9ti8tgro7nik51pqi7igmna00v.apps.googleusercontent.com.json');

            const OAuthClient = new OAuth2(
                credential.web.client_id,
                credential.web.client_secret,
                credential.web.redirect_uris[0]
            );

            return OAuthClient;
        }

        function requestUserConsent() {

            const consentUrl = OAuthClient.generateAuthUrl({
                access_type: 'offline',
                scope: ['https://www.googleapis.com/auth/youtube']
            });

            console.log(`> Please give your consent: ${consentUrl}`);
        }

        async function waitForGoogleCallback() {

            return new Promise((resolve, reject) => {

                console.log('> Waiting for user consent...');

                webServer.app.get('/oauth2callback', (req, res) => {

                    const authCode = req.query.code;

                    console.log(`> Consent given: ${authCode}`);

                    res.send('<h1>Thank you!</h1></br><p>Now close this tab.</p>');

                    resolve(authCode);
                })
            });
        }

        async function requestGoogleForAccessTokens(OAuthClient, authorizationToken) {

            return new Promise((resolve, reject) => {

                OAuthClient.getToken(authorizationToken, (err, tokens) => {

                    if (err) {
                        return reject(err);
                    }

                    console.log(`> Access tokens received;`);
                    // console.log(tokens)

                    OAuthClient.setCredentials(tokens);
                    resolve();
                });
            });
        }

        function setGlobalGoogleAthentication(OAuthClient) {

            google.options({
                auth: OAuthClient
            });
        }

        async function stopWebServer(webServer) {

            return new Promise((resolve, reject) => {

                webServer.server.close(() => resolve());
            });
        }
    }

    async function uploadVideo(content) {

        const videoFilePath = './video.mp4';
        const videoFileSize = fs.statSync(videoFilePath).size;
        const videoTitle = `${content.prefix} ${content.searchTerm}`;
        const videoTags = [content.searchTerm, ...content.sentences[0].keywords];
        const videoDescription = content.sentences.map(sentence => sentence.text).join('\n\n');

        const requestParameters = {
            part: 'snippet, status',
            requestBody: {
                snippet: {
                    title: videoTitle,
                    description: videoDescription,
                    tags: videoTags
                },
                status: {
                    privacyStatus: 'unlisted'
                }
            },
            media: {
                body: fs.createReadStream(videoFilePath)
            }
        };

        const youtubeResponse = await youtube.videos.insert(requestParameters, {
            onUploadProgress
        });

        console.log(`> Video available at: https://youtu.be/${youtubeResponse.data.id}`);

        return youtubeResponse.data;

        function onUploadProgress(event) {

            const progress = Math.round((event.bytesRead / videoFileSize) * 100);
            console.log(`> ${progress}% complete...`);
        }
    }

    async function uploadThumbnail(videoInformation) {

        const videoId = videoInformation.id
        const videoThumbnailFilePath = './content/youtube-thumbnail.jpg'

        const requestParameters = {
            videoId: videoId,
            media: {
                mimeType: 'image/jpeg',
                body: fs.createReadStream(videoThumbnailFilePath)
            }
        }

        const youtubeResponse = await youtube.thumbnails.set(requestParameters)
        console.log(`> [youtube-robot] Thumbnail uploaded!`)
    }
}

module.exports = robot