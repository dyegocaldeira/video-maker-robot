const state = require('./state');
const google = require('googleapis').google;
const youtube = google.youtube({ version: 'v3' });
const OAuth2 = google.auth.OAuth2;
const express = require('express');
const fs = require('fs');
const credential = require('../credentials/client_secret_677170794300-68mkad9ti8tgro7nik51pqi7igmna00v.apps.googleusercontent.com.json');

async function robot() {

    console.log(`> [YouTube-robot] Starting ...`);

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

                    console.log(`> [YouTube-robot] Listening on http://localhost:${port}`);

                    resolve({
                        app,
                        server
                    })
                });
            });
        }

        async function createOAuthClient() {

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

            console.log(`> [YouTube-robot] Please give your consent: ${consentUrl}`);
        }

        async function waitForGoogleCallback() {

            return new Promise((resolve, reject) => {

                console.log('> Waiting for user consent...');

                webServer.app.get('/oauth2callback', (req, res) => {

                    const authCode = req.query.code;

                    console.log(`> [YouTube-robot] Consent given: ${authCode}`);

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

                    console.log(`> [YouTube-robcot] Access tokens received!`);

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

            return new Promise(resolve => {

                webServer.server.close(() => resolve());
            });
        }
    }

    async function uploadVideo(content) {

        const { prefix, searchTerm } = content;
        const videoFilePath = `./${prefix}-${searchTerm}.mp4`;
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

        console.log(`> [YouTube-robot] Starting Starting to upload the video to YouTube.`);

        const youtubeResponse = await youtube.videos.insert(requestParameters, {
            onUploadProgress
        });

        console.log(`> [YouTube-robot] Video available at: https://youtu.be/${youtubeResponse.data.id}`);

        return youtubeResponse.data;

        function onUploadProgress(event) {

            const progress = Math.round((event.bytesRead / videoFileSize) * 100);
            console.log(`> [YouTube-robot] ${progress}% complete...`);
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
        console.log(`> [YouTube-robot] Thumbnail uploaded!`)
    }
}

module.exports = robot