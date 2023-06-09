import * as dotenv from 'dotenv';

dotenv.config({ path: process.env.NODE_ENV_LOCAL });
dotenv.config({ path: process.env.NODE_ENV });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ApiModule } from '../src/api.module';

import { usersPool } from './dbPools/userDb';
import { PoolClient } from 'pg';

import * as cookieParser from 'cookie-parser';
import { socialPool } from './dbPools/socialDb';
import { registerUserHelper } from './helpers/register.user';
import { CreateReviewHelper } from './helpers/create.review';
import { ReviewTreePublic } from '@shared';

describe('Reviews e2e', () => {
  let app: INestApplication;
  let userPoolClient: PoolClient;
  let socialPoolClient: PoolClient;

  let reviewRootchilds: ReviewTreePublic[];
  let review4childs: ReviewTreePublic[];
  let review6childs: ReviewTreePublic[];
  let review11childs: ReviewTreePublic[];

  let ownerAccess: string; // OWNER

  let bobAccess: string;
  let aliceAccess: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());

    await app.init();

    userPoolClient = await usersPool.connect();
    socialPoolClient = await socialPool.connect();

    // Инициализируем сервер
    await request(app.getHttpServer()).get('/init').expect(200);

    // получаем токен админа
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.OWNER_MAIL,
        password: process.env.OWNER_PASSWORD,
      })
      .expect((resp: any) => {
        ownerAccess = JSON.parse(resp.text).token;
      });
  });

  it('Регистрируем пару пользователей', async () => {
    // Регистрируем пару пользователей
    bobAccess = await registerUserHelper(app, 'Bob');
    aliceAccess = await registerUserHelper(app, 'Alice');
  });

  // 1. Bob
  // 2. Bob
  // 3. Alice
  // 4. Alice
  // ├── 6. Bob
  // │   ├── 7. Alice
  // │   ├── 9. Alice
  // │   ├── 10. Bob
  // │   ├── 11. Bob
  // │   │   ├── 13. Alice
  // │   │   ├── 18. Alice
  // │   │   └── 19. Alice
  // │   ├── 12. Alice
  // │   └── 17. Alice
  // ├── 14. Bob
  // └── 15. Bob
  // 5. Bob
  // 8. Alice
  // 16. Bob

  it('Создаем множество комментариев для фильма с id=13', async () => {
    const aliceHelper = new CreateReviewHelper(app, aliceAccess, 13);
    const bobHelper = new CreateReviewHelper(app, bobAccess, 13);

    await bobHelper.createReviewHelper(1);
    await bobHelper.createReviewHelper(2);
    await aliceHelper.createReviewHelper(3);
    await aliceHelper.createReviewHelper(4);
    await bobHelper.createReviewHelper(5);
    await bobHelper.createReviewHelper(6, 4);
    await aliceHelper.createReviewHelper(7, 6);
    await aliceHelper.createReviewHelper(8);
    await aliceHelper.createReviewHelper(9, 6);
    await bobHelper.createReviewHelper(10, 6);
    await bobHelper.createReviewHelper(11, 6);
    await aliceHelper.createReviewHelper(12, 6);
    await aliceHelper.createReviewHelper(13, 11);
    await bobHelper.createReviewHelper(14, 4);
    await bobHelper.createReviewHelper(15, 4);
    await bobHelper.createReviewHelper(16);
    await aliceHelper.createReviewHelper(17, 6);
    await aliceHelper.createReviewHelper(18, 11);
    await aliceHelper.createReviewHelper(19, 11);
  });

  describe('GET /api/reviews/:filmid Выбираем всю глубину', () => {
    it('Выбираем все дерево отзывов (всю глубину) для фильма с id=13', async () => {
      reviewRootchilds = JSON.parse(
        (await request(app.getHttpServer()).get('/reviews/film/13').expect(200))
          .text,
      );
    });

    describe('Проверка корневых элементов', () => {
      it('Верхний 0-й уровень состоит из 7 элементов', () => {
        expect(reviewRootchilds).toHaveLength(7);
      });

      it('Отзывы отсортированы от поздних к ранним', () => {
        expect(reviewRootchilds[0].title).toBe('Rev 16');
        expect(reviewRootchilds[1].title).toBe('Rev 8');
        expect(reviewRootchilds[2].title).toBe('Rev 5');
        expect(reviewRootchilds[3].title).toBe('Rev 4');
        expect(reviewRootchilds[4].title).toBe('Rev 3');
        expect(reviewRootchilds[5].title).toBe('Rev 2');
        expect(reviewRootchilds[6].title).toBe('Rev 1');
      });

      it('4й отзыв имеет 3х детей по записи и по факту', () => {
        expect(reviewRootchilds[3].childsNum).toBe(3);
        expect(reviewRootchilds[3].childs).toHaveLength(3);
        review4childs = reviewRootchilds[3].childs;
      });
    });

    describe('Проверка детей 4го отзыва', () => {
      it('Дети в порядке 15->14->6', () => {
        expect(review4childs[0].title).toBe('Rev 15');
        expect(review4childs[1].title).toBe('Rev 14');
        expect(review4childs[2].title).toBe('Rev 6');
      });

      it('6й отзыв имеет 3х детей по записи и по факту', () => {
        expect(review4childs[2].childsNum).toBe(6);
        expect(review4childs[2].childs).toHaveLength(6);
        review6childs = review4childs[2].childs;
      });
    });

    describe('Проверка детей 6го отзыва', () => {
      it('Дети в порядке 17->12->11->10->9->7', () => {
        expect(review6childs[0].title).toBe('Rev 17');
        expect(review6childs[1].title).toBe('Rev 12');
        expect(review6childs[2].title).toBe('Rev 11');
        expect(review6childs[3].title).toBe('Rev 10');
        expect(review6childs[4].title).toBe('Rev 9');
        expect(review6childs[5].title).toBe('Rev 7');
      });

      it('11й отзыв имеет 3х детей по записи и по факту', () => {
        expect(review6childs[2].childsNum).toBe(3);
        expect(review6childs[2].childs).toHaveLength(3);
        review11childs = review6childs[2].childs;
      });
    });

    describe('Проверка детей 11 отзыва', () => {
      it('Дети в порядке 19->18->13', () => {
        expect(review11childs[0].title).toBe('Rev 19');
        expect(review11childs[1].title).toBe('Rev 18');
        expect(review11childs[2].title).toBe('Rev 13');
      });
    });
  });

  afterAll(async () => {
    // Чистим таблицы
    await userPoolClient.query('TRUNCATE users RESTART IDENTITY CASCADE');
    await userPoolClient.query('TRUNCATE roles RESTART IDENTITY CASCADE');
    await userPoolClient.query('TRUNCATE tokens RESTART IDENTITY CASCADE');
    await socialPoolClient.query('TRUNCATE profiles RESTART IDENTITY CASCADE');
    await socialPoolClient.query('TRUNCATE reviews RESTART IDENTITY CASCADE');

    // console.log(queryResult.rows);

    userPoolClient.release(true);
    socialPoolClient.release(true);
    await usersPool.end();
    await socialPool.end();

    await app.close();
  }, 6000);
});
