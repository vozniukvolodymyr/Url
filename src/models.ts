// @/models.tsz
import { Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export default class Url extends Model<InferAttributes<Url>, InferCreationAttributes<Url>> {
  declare FULL: string;
  declare SHORT: string;
  // createdAt can be undefined during creation
  declare createdAt: CreationOptional<Date>;
  // updatedAt can be undefined during creation
  declare updatedAt: CreationOptional<Date>;
}