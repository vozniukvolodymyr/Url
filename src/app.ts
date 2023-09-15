import "reflect-metadata";
import 'dotenv/config';
import express, { Request, Response, Application } from "express";
import type { RedisClientType } from 'redis'
import { Schema, Repository } from "redis-om";
import { Sequelize, DataTypes } from "sequelize";
import Url from "./models";
import orm from "./db/config"


export const getApp = (rClient: RedisClientType) => {
  const app: Application = express();

  Url.init(
    {
      FULL: {
        type: DataTypes.STRING,
        allowNull: false
      },
      SHORT: {
        type: DataTypes.STRING,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
    },
    {
      tableName: 'urls',
      sequelize: orm
    }
  );

  let redisClient: RedisClientType = rClient;
  let urlRepository: Repository;

  (async () => {
    await redisClient.connect();
    redisClient.flushAll()
    const urlSchema = new Schema('urls', {
      full: { type: 'string' },
      short: { type: 'string' }
    }, {
      dataStructure: 'HASH'
    });

    urlRepository = new Repository(urlSchema, redisClient);
    await urlRepository.createIndex();

  })();

  async function fetchShort(res: Response, url: string) {
    try {
      const short = await Url.findOne({ where: { FULL: url } });
      return short;
    } catch (error) {
      console.error(error);
      res.status(404).send("Data unavailable");
    }
  }

  async function fetchFull(res: Response, url: string) {
    try {
      const full = await Url.findOne({ where: { SHORT: url } });
      return full;
    } catch (error) {
      console.error(error);
      res.status(404).send("Data unavailable");
    }
  }

  async function cacheFullData(req: Request, res: Response, next: Function) {
    const url = req.query.url as string;
    try {
      const result = await urlRepository.search()
        .where('short').equals(url).return.all()
      if (result.length > 0) {
        res.send(result);
      } else {
        next();
      }
    } catch (error) {
      console.error(error);
      res.status(404);
    }
  }

  async function cacheShortData(req: Request, res: Response, next: Function) {
    const url = req.query.url as string;
    try {
      const result = await urlRepository.search()
        .where('full').equals(url)
        .return.all();
      if (result.length > 0) {
        res.send(result);
      } else {
        next();
      }
    } catch (error) {
      console.error(error);
      res.status(404);
    }
  }

  async function getShort(req: Request, res: Response) {
    try {
      const url: string = req.query.url as string;
      const result = await fetchShort(res, url);
      if (!result?.SHORT) {
        res.status(404).send("The short name is not founded");
        return;
      }
      await urlRepository.save({
        full: url,
        short: result.SHORT
      });
      res.send(result.SHORT);
    } catch (error) {
      console.error(error);
      res.status(404).send("Data unavailable");
    }
  }

  async function getFull(req: Request, res: Response) {
    const url: string = req.query.url as string;
    try {
      const result = await fetchFull(res, url);
      if (!result?.FULL) {
        res.status(404).send("The full name is not founded");
        return;
      }
      await urlRepository.save({
        full: result.FULL,
        short: url
      });
      res.send(result.FULL);
    } catch (error) {
      console.error(error);
      res.status(404).send("Data unavailable");
    }
  }

  async function setName(req: Request, res: Response) {
    const shortName = req.query.short as string;
    const fullName = req.query.full as string;
    try {
      const [name, created] = await Url.findOrCreate({ where: { FULL: fullName, SHORT: shortName } });
      if (!created) {
        return res.status(200).send("The name already exists");
      } else {
        await Url.create({
          FULL: name.FULL,
          SHORT: name.SHORT
        })
      }
      await urlRepository.save({
        full: fullName,
        short: shortName
      });
      res.status(200).send("The name is inserted successfully");
    } catch (error) {
      console.error(error);
      res.status(404).send("The name is not inserted");
    }
  }

  app.get("/short", cacheShortData, getShort);
  app.get("/full", cacheFullData, getFull);
  app.post("/", setName);
  return app;
}