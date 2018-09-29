import { ApolloServer } from 'apollo-server';
import schema from './Schema';

export default new ApolloServer({ schema });
