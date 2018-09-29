import { ApolloServer } from 'apollo-server';
import { version } from './package.json';

const typeDefs = [];

const server = new ApolloServer({
  typeDefs,
});

server
  .listen()
  .then(({ url }) => {
    console.log(`CQL v${version} started at ${url}`);
  });
