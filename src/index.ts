import {getApp} from "./app"
import orm from "./db/config"
import { createClient } from "redis";
import type { RedisClientType } from 'redis'

const port = process.env.PORT || 3000;

let redisClient: RedisClientType;

redisClient = createClient({
  socket: {
    port: 6380,
    host: '0.0.0.0'
  }
});
redisClient.on("error", (error) => console.error(`Error : ${error}`));

const app = getApp(redisClient);

const start = async (): Promise<void> => {
    try {
      orm.authenticate().then(() => {
        console.log('Connection has been established successfully.');
      }).catch((error) => {
        console.error('Unable to connect to the database: ', error);
      });
      await orm.sync();
      app.listen(port, () => {
        console.log("Server started on port 3000");
      });
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  };

  void start();