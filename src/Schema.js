import {
  GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLBoolean, GraphQLList,
  GraphQLInt,
  GraphQLFloat,
  GraphQLID,
} from 'graphql';
import fs from 'fs';
import path from 'path';
import { camelize, singularize } from 'inflected';
import glob from 'glob';

const dataPath = path.resolve(__dirname, '../example');
const schemaPath = path.resolve(dataPath, '.schema.json');
const schemaData = fs.readFileSync(schemaPath, 'utf-8');
const schema = JSON.parse(schemaData);

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
const data = {};
const dataSearch = path.resolve(dataPath, '*.json');

function queryName(dataFilePath) {
  return path.basename(dataFilePath, '.json');
}

function readDataFile(dataFilePath) {
  const raw = fs.readFileSync(dataFilePath, 'utf-8');

  data[queryName(dataFilePath)] = JSON.parse(raw);
}

glob.sync(dataSearch).forEach(dataFilePath => {
  const name = queryName(dataFilePath);

  readDataFile(dataFilePath);

  queries[name] = {
    type: new GraphQLList(objectTypes[singularize(name)]),
    resolve: () => data[name],
  };
});

export default new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: queries,
  }),
});
