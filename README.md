CQL - GraphQL for static data
----------------------------

Store your content with Git (easy revision control)

Consume your content with GraphQL (fetch what you need)

## Setup

```bash
hub clone joshnuss/cql
cd cql
yarn
```

## Create a content folder

```bash
mkdir example
```

Create a `.schema.json` file to describe your data strucure, here's an example:

```json
{
  "teams": {
    "type": "Array",
    "of": "team"
  },
  "team": {
    "type": "Object",
    "description": "A collection of members",
    "fields": {
      "id": "id",
      "name": "String",
      "members": {
        "type": "Array",
        "of": "member"
      }
    }
  },
  "member": {
    "type": "Object",
    "description": "A single person on the team",
    "fields": {
      "id": "id",
      "name": "String",
      "position": "String",
      "email": "String"
    }
  }
}
```

Create a `teams.json` file to store your data, here's an example:

```json
[
  {
    "id": "engineering",
    "name": "Engineering",
    "members": [
      {
        "id": "joshnuss",
        "name": "Josh Nussbaum",
        "email": "joshnuss@gmail.com"
      }
    ]
  }
]
```


## Run server

```bash
yarn start
```

Visit http://localhost:4000 to test queries and subscriptions

## License

MIT
