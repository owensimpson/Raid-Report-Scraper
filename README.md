# How to use

Install Dependencies
```shell
npm i
```

Create a file called ```.env``` in the project folder:
```dotenv
API_KEY="YOUR-BUNGIE-API-KEY"
CLIENT_ID="YOUR-BUNGIE-CLIENT-ID"
SECRET="YOUR-BUNGIE-SECRET"
```

Edit the ```util.ts``` file on this line to the bungie name you want

```typescript
/// NAME GOES HERE ///
const bungieName = 'Newo#9010';
```

Run the program
```shell
npm run go
```