import {
  GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLBoolean, GraphQLList,
  GraphQLInt,
  GraphQLFloat,
  GraphQLID,
} from 'graphql';
import fs from 'fs';
import path from 'path';
import { camelize } from 'inflected';

const schemaPath = path.resolve(__dirname, '../example/.schema.json');
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

  if (object.type === 'Object') {
    objectTypes[name] = new GraphQLObjectType({
      name: camelize(name),
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

export default new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      teams: {
        type: new GraphQLList(objectTypes.team),
        resolve: () => {
          const filePath = path.resolve(__dirname, '../example/teams.json');
          const data = fs.readFileSync(filePath, 'utf-8');

          return JSON.parse(data);
        },
      },
    },
  }),
});
