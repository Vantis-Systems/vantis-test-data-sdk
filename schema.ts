import { table, uuid, text, genRandomUuid } from '@vantis/data';

export const users = table('users', {
  id: uuid().primaryKey().default(genRandomUuid()),
  email: text().notNull().unique(),
  name: text(),
});

export const posts = table('posts', {
  id: uuid().primaryKey().default(genRandomUuid()),
  user_id: uuid().notNull().references(() => users.id),
  title: text().notNull(),
});
