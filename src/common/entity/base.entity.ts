import { v4 } from 'uuid';
import { PrimaryKey, Property } from '@mikro-orm/core';

export class Base {
  @PrimaryKey()
  public id: string = v4();

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
