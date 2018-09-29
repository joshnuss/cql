/* eslint-disable no-console */
import Server from './src/Server';
import { version } from './package.json';

Server
  .listen()
  .then(({ url }) => {
    console.log(`CQL v${version} started at ${url}`);
  });
