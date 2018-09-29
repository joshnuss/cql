import {
  GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLBoolean, GraphQLList,
  GraphQLInt,
  GraphQLFloat,
  GraphQLID,
} from 'graphql';
import { PubSub } from 'apollo-server';
import fs from 'fs';
import path from 'path';
import { camelize, singularize } from 'inflected';
import glob from 'glob';
import _ from 'lodash';

const dataPath = path.resolve(__dirname, '../example');
const schemaPath = path.resolve(dataPath, '.schema.json');
const schemaData = fs.readFileSync(schemaPath, 'utf-8');
const schema = JSON.parse(schemaData);

const pubsub = new PubSub();

const objectTypes = {};
const typeMap = {
  String: GraphQLString,
  Boolean: GraphQLBoolean,
  Int: GraphQLInt,
  Float: GraphQLFloat,
  Id: GraphQLID,
};

function typeForField(type) {
  if (typeof (type) === 'object') {
    if (type.type === 'Array') {
      return {
        type: new GraphQLList(typeForField(type.of).type),
      };
    }
  }

  const mapped = typeMap[camelize(type)] || objectTypes[type];

  return { type: mapped };
}

Object.keys(schema).forEach(name => {
  const object = schema[name];

  if (object.type === 'Object' || !object.type) {
    objectTypes[name] = new GraphQLObjectType({
      name: camelize(name),
      description: object.description,
      fields: () => {
        const fields = {};

        Object.keys(object.fields).forEach(fieldName => {
          fields[fieldName] = typeForField(object.fields[fieldName]);
        });

        return fields;
      },
    });
  }
});

const queries = {};
const subscriptions = {};
const data = {};
const dataSearch = path.resolve(dataPath, '*.json');

function queryName(dataFilePath) {
  return path.basename(dataFilePath, '.json');
}

function readDataFile(dataFilePath) {
  const raw = fs.readFileSync(dataFilePath, 'utf-8');

  return JSON.parse(raw);
}

function diff(oldData, newData) {
  const oldDict = _.keyBy(oldData, 'id');
  const newDict = _.keyBy(newData, 'id');
  const oldIds = Object.keys(oldDict);
  const newIds = Object.keys(newDict);

  const added = [];
  const changed = [];
  const deleted = [];

  _.difference(newIds, oldIds).forEach(id => {
    added.push(newDict[id]);
  });

  oldIds.forEach(id => {
    if (newDict[id]) {
      if (JSON.stringify(oldDict[id]) !== JSON.stringify(newDict[id])) {
        changed.push(newDict[id]);
      }
    } else {
      deleted.push(oldDict[id]);
    }
  });

  return { added, changed, deleted };
}

glob.sync(dataSearch).forEach(dataFilePath => {
  const name = queryName(dataFilePath);
  const singular = singularize(name);
  const events = {
    added: `${singular}Added`,
    changed: `${singular}Changed`,
    deleted: `${singular}Deleted`,
  };

  data[name] = readDataFile(dataFilePath);

  fs.watchFile(dataFilePath, () => {
    const oldData = data[name];
    data[name] = readDataFile(dataFilePath);

    const { added, changed, deleted } = diff(oldData, data[name]);

    added.forEach(record => {
      const args = {};

      args[events.added] = record;

      pubsub.publish(events.added, args);
    });

    changed.forEach(record => {
      const args = {};

      args[events.changed] = record;

      pubsub.publish(events.changed, args);
    });

    deleted.forEach(record => {
      const args = {};

      args[events.deleted] = record;

      pubsub.publish(events.deleted, args);
    });
  });

  queries[name] = {
    type: new GraphQLList(objectTypes[singularize(name)]),
    resolve: () => data[name],
  };

  subscriptions[events.added] = {
    type: objectTypes[singular],
    subscribe: () => pubsub.asyncIterator([events.added]),
  };

  subscriptions[events.changed] = {
    type: objectTypes[singular],
    subscribe: () => pubsub.asyncIterator([events.changed]),
  };

  subscriptions[events.deleted] = {
    type: objectTypes[singular],
    subscribe: () => pubsub.asyncIterator([events.changed]),
  };
});

export default new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: queries,
  }),
  subscription: new GraphQLObjectType({
    name: 'Subscription',
    fields: subscriptions,
  }),
});
