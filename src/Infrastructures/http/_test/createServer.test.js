import request from 'supertest';
import pool from '../../database/postgres/pool.js';
import UsersTableTestHelper from '../../../../tests/UsersTableTestHelper.js';
import AuthenticationsTableTestHelper from '../../../../tests/AuthenticationsTableTestHelper.js';
import ThreadsTableTestHelper from '../../../../tests/ThreadsTableTestHelper.js';
import CommentsTableTestHelper from '../../../../tests/CommentsTableTestHelper.js';
import RepliesTableTestHelper from '../../../../tests/RepliesTableTestHelper.js';
import UserCommentLikesTableTestHelper from '../../../../tests/UserCommentLikesTableTestHelper.js';
import container from '../../container.js';
import createServer from '../createServer.js';
import AuthenticationTokenManager from '../../../Applications/security/AuthenticationTokenManager.js';

describe('HTTP server', () => {
  afterAll(async () => {
    await pool.end();
  });

  afterEach(async () => {
    await UserCommentLikesTableTestHelper.cleanTable();
    await RepliesTableTestHelper.cleanTable();
    await CommentsTableTestHelper.cleanTable();
    await ThreadsTableTestHelper.cleanTable();
    await UsersTableTestHelper.cleanTable();
    await AuthenticationsTableTestHelper.cleanTable();
  });

  it('should response 404 when request unregistered route', async () => {
    // Arrange
    const app = await createServer({});

    // Action
    const response = await request(app).get('/unregisteredRoute');

    // Assert
    expect(response.status).toEqual(404);
  });

  it('should response 200 and return hello world message when GET /', async () => {
    // Arrange
    const app = await createServer({});

    // Action
    const response = await request(app).get('/');

    // Assert
    expect(response.status).toEqual(200);
    expect(response.body.status).toEqual('success');
    expect(response.body.message).toEqual('Hello World!!!');
  });

  describe('when POST /users', () => {
    it('should response 201 and persisted user', async () => {
      // Arrange
      const requestPayload = {
        username: 'dicoding',
        password: 'secret',
        fullname: 'Dicoding Indonesia',
      };
      const app = await createServer(container);

      // Action
      const response = await request(app).post('/users').send(requestPayload);

      // Assert
      expect(response.status).toEqual(201);
      expect(response.body.status).toEqual('success');
      expect(response.body.data.addedUser).toBeDefined();
    });

    it('should response 400 when request payload not contain needed property', async () => {
      // Arrange
      const requestPayload = {
        fullname: 'Dicoding Indonesia',
        password: 'secret',
      };
      const app = await createServer(container);

      // Action
      const response = await request(app).post('/users').send(requestPayload);

      // Assert
      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('tidak dapat membuat user baru karena properti yang dibutuhkan tidak ada');
    });

    it('should response 400 when request payload not meet data type specification', async () => {
      // Arrange
      const requestPayload = {
        username: 'dicoding',
        password: 'secret',
        fullname: ['Dicoding Indonesia'],
      };
      const app = await createServer(container);

      // Action
      const response = await request(app).post('/users').send(requestPayload);

      // Assert
      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('tidak dapat membuat user baru karena tipe data tidak sesuai');
    });

    it('should response 400 when username more than 50 character', async () => {
      // Arrange
      const requestPayload = {
        username: 'dicodingindonesiadicodingindonesiadicodingindonesiadicoding',
        password: 'secret',
        fullname: 'Dicoding Indonesia',
      };
      const app = await createServer(container);

      // Action
      const response = await request(app).post('/users').send(requestPayload);

      // Assert
      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('tidak dapat membuat user baru karena karakter username melebihi batas limit');
    });

    it('should response 400 when username contain restricted character', async () => {
      // Arrange
      const requestPayload = {
        username: 'dicoding indonesia',
        password: 'secret',
        fullname: 'Dicoding Indonesia',
      };
      const app = await createServer(container);

      // Action
      const response = await request(app).post('/users').send(requestPayload);

      // Assert
      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('tidak dapat membuat user baru karena username mengandung karakter terlarang');
    });

    it('should response 400 when username unavailable', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ username: 'dicoding' });
      const requestPayload = {
        username: 'dicoding',
        fullname: 'Dicoding Indonesia',
        password: 'super_secret',
      };
      const app = await createServer(container);

      // Action
      const response = await request(app).post('/users').send(requestPayload);

      // Assert
      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('username tidak tersedia');
    });
  });

  describe('when POST /authentications', () => {
    it('should response 201 and new authentication', async () => {
      const requestPayload = {
        username: 'dicoding',
        password: 'secret',
      };
      const app = await createServer(container);

      await request(app).post('/users').send({
        username: 'dicoding',
        password: 'secret',
        fullname: 'Dicoding Indonesia',
      });

      const response = await request(app).post('/authentications').send(requestPayload);

      expect(response.status).toEqual(201);
      expect(response.body.status).toEqual('success');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should response 400 if username not found', async () => {
      const requestPayload = {
        username: 'dicoding',
        password: 'secret',
      };
      const app = await createServer(container);

      const response = await request(app).post('/authentications').send(requestPayload);

      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('username tidak ditemukan');
    });

    it('should response 401 if password wrong', async () => {
      const requestPayload = {
        username: 'dicoding',
        password: 'wrong_password',
      };
      const app = await createServer(container);

      await request(app).post('/users').send({
        username: 'dicoding',
        password: 'secret',
        fullname: 'Dicoding Indonesia',
      });

      const response = await request(app).post('/authentications').send(requestPayload);

      expect(response.status).toEqual(401);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('kredensial yang Anda masukkan salah');
    });

    it('should response 400 if login payload not contain needed property', async () => {
      const requestPayload = {
        username: 'dicoding',
      };
      const app = await createServer(container);

      const response = await request(app).post('/authentications').send(requestPayload);

      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('harus mengirimkan username dan password');
    });

    it('should response 400 if login payload wrong data type', async () => {
      const requestPayload = {
        username: 123,
        password: 'secret',
      };
      const app = await createServer(container);

      const response = await request(app).post('/authentications').send(requestPayload);

      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('username dan password harus string');
    });
  });

  describe('when PUT /authentications', () => {
    it('should return 200 and new access token', async () => {
      const app = await createServer(container);

      await request(app).post('/users').send({
        username: 'dicoding',
        password: 'secret',
        fullname: 'Dicoding Indonesia',
      });

      const loginResponse = await request(app).post('/authentications').send({
        username: 'dicoding',
        password: 'secret',
      });

      const { refreshToken } = loginResponse.body.data;
      const response = await request(app).put('/authentications').send({ refreshToken });

      expect(response.status).toEqual(200);
      expect(response.body.status).toEqual('success');
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should return 400 payload not contain refresh token', async () => {
      const app = await createServer(container);

      const response = await request(app).put('/authentications').send({});

      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('harus mengirimkan token refresh');
    });

    it('should return 400 if refresh token not string', async () => {
      const app = await createServer(container);

      const response = await request(app).put('/authentications').send({ refreshToken: 123 });

      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('refresh token harus string');
    });

    it('should return 400 if refresh token not valid', async () => {
      const app = await createServer(container);

      const response = await request(app).put('/authentications').send({ refreshToken: 'invalid_refresh_token' });

      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('refresh token tidak valid');
    });

    it('should return 400 if refresh token not registered in database', async () => {
      const app = await createServer(container);
      const refreshToken = await container.getInstance(AuthenticationTokenManager.name).createRefreshToken({ username: 'dicoding' });

      const response = await request(app).put('/authentications').send({ refreshToken });

      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('refresh token tidak ditemukan di database');
    });
  });

  describe('when DELETE /authentications', () => {
    it('should response 200 if refresh token valid', async () => {
      const app = await createServer(container);
      const refreshToken = 'refresh_token';
      await AuthenticationsTableTestHelper.addToken(refreshToken);

      const response = await request(app).delete('/authentications').send({ refreshToken });

      expect(response.status).toEqual(200);
      expect(response.body.status).toEqual('success');
    });

    it('should response 400 if refresh token not registered in database', async () => {
      const app = await createServer(container);
      const refreshToken = 'refresh_token';

      const response = await request(app).delete('/authentications').send({ refreshToken });

      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('refresh token tidak ditemukan di database');
    });

    it('should response 400 if payload not contain refresh token', async () => {
      const app = await createServer(container);

      const response = await request(app).delete('/authentications').send({});

      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('harus mengirimkan token refresh');
    });
  });

  describe('when POST /threads', () => {
    it('should response 201 and persisted thread', async () => {
      // Arrange
      const requestPayload = {
        title: 'sebuah thread',
        body: 'isi thread',
      };
      await UsersTableTestHelper.addUser({ id: 'user-123', username: 'dicoding' });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-123', username: 'dicoding' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .post('/threads')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestPayload);

      // Assert
      expect(response.status).toEqual(201);
      expect(response.body.status).toEqual('success');
      expect(response.body.data.addedThread.id).toBeDefined();
      expect(response.body.data.addedThread.title).toEqual(requestPayload.title);
      expect(response.body.data.addedThread.owner).toEqual('user-123');

      const thread = await ThreadsTableTestHelper.findThreadsById(response.body.data.addedThread.id);
      expect(thread).toHaveLength(1);
    });

    it('should response 401 when request without authentication', async () => {
      // Arrange
      const requestPayload = {
        title: 'sebuah thread',
        body: 'isi thread',
      };
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .post('/threads')
        .send(requestPayload);

      // Assert
      expect(response.status).toEqual(401);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('Missing authentication');
    });

    it('should response 400 when request payload not contain needed property', async () => {
      // Arrange
      const requestPayload = {
        title: 'sebuah thread',
      };
      await UsersTableTestHelper.addUser({ id: 'user-123', username: 'dicoding' });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-123', username: 'dicoding' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .post('/threads')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestPayload);

      // Assert
      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('tidak dapat membuat thread baru karena properti yang dibutuhkan tidak ada');
    });

    it('should response 400 when request payload not meet data type specification', async () => {
      // Arrange
      const requestPayload = {
        title: true,
        body: 'isi thread',
      };
      await UsersTableTestHelper.addUser({ id: 'user-123', username: 'dicoding' });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-123', username: 'dicoding' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .post('/threads')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestPayload);

      // Assert
      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('tidak dapat membuat thread baru karena tipe data tidak sesuai');
    });
  });

  describe('when GET /threads/:threadId', () => {
    it('should response 200 and return thread details', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-get-thread-123', username: 'dicoding-get-thread' });
      await UsersTableTestHelper.addUser({ id: 'user-get-comment-123', username: 'johndoe-get-thread' });
      await ThreadsTableTestHelper.addThread({
        id: 'thread-get-123',
        title: 'sebuah thread',
        body: 'sebuah body thread',
        owner: 'user-get-thread-123',
        date: '2021-08-08T07:19:09.775Z',
      });
      await CommentsTableTestHelper.addComment({
        id: 'comment-get-123',
        content: 'sebuah comment',
        threadId: 'thread-get-123',
        owner: 'user-get-comment-123',
        date: '2021-08-08T07:22:33.555Z',
      });
      await RepliesTableTestHelper.addReply({
        id: 'reply-get-123',
        content: 'sebuah balasan',
        commentId: 'comment-get-123',
        owner: 'user-get-thread-123',
        date: '2021-08-08T07:23:33.555Z',
      });
      await UserCommentLikesTableTestHelper.addLike({
        commentId: 'comment-get-123',
        owner: 'user-get-thread-123',
      });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .get('/threads/thread-get-123');

      // Assert
      expect(response.status).toEqual(200);
      expect(response.body.status).toEqual('success');
      expect(response.body.data.thread).toStrictEqual({
        id: 'thread-get-123',
        title: 'sebuah thread',
        body: 'sebuah body thread',
        date: '2021-08-08T07:19:09.775Z',
        username: 'dicoding-get-thread',
        comments: [
          {
            id: 'comment-get-123',
            username: 'johndoe-get-thread',
            date: '2021-08-08T07:22:33.555Z',
            content: 'sebuah comment',
            likeCount: 1,
            replies: [
              {
                id: 'reply-get-123',
                username: 'dicoding-get-thread',
                date: '2021-08-08T07:23:33.555Z',
                content: 'sebuah balasan',
              },
            ],
          },
        ],
      });
    });

    it('should response 404 when thread not found', async () => {
      // Arrange
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .get('/threads/thread-not-found');

      // Assert
      expect(response.status).toEqual(404);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('thread tidak ditemukan');
    });
  });

  describe('when PUT /threads/:threadId/comments/:commentId/likes', () => {
    it('should response 200 and persist comment like', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-like-comment-123', username: 'dicoding-like-comment' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-like-comment-123', owner: 'user-like-comment-123' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-like-comment-123',
        threadId: 'thread-like-comment-123',
        owner: 'user-like-comment-123',
      });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-like-comment-123', username: 'dicoding-like-comment' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .put('/threads/thread-like-comment-123/comments/comment-like-comment-123/likes')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert
      expect(response.status).toEqual(200);
      expect(response.body.status).toEqual('success');

      const likes = await UserCommentLikesTableTestHelper.findLikeByCommentIdAndOwner(
        'comment-like-comment-123',
        'user-like-comment-123',
      );
      expect(likes).toHaveLength(1);
    });

    it('should response 200 and unlike when already liked', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-like-comment-124', username: 'dicoding-like-comment-2' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-like-comment-124', owner: 'user-like-comment-124' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-like-comment-124',
        threadId: 'thread-like-comment-124',
        owner: 'user-like-comment-124',
      });
      await UserCommentLikesTableTestHelper.addLike({
        commentId: 'comment-like-comment-124',
        owner: 'user-like-comment-124',
      });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-like-comment-124', username: 'dicoding-like-comment-2' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .put('/threads/thread-like-comment-124/comments/comment-like-comment-124/likes')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert
      expect(response.status).toEqual(200);
      expect(response.body.status).toEqual('success');

      const likes = await UserCommentLikesTableTestHelper.findLikeByCommentIdAndOwner(
        'comment-like-comment-124',
        'user-like-comment-124',
      );
      expect(likes).toHaveLength(0);
    });

    it('should response 401 when request without authentication', async () => {
      // Arrange
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .put('/threads/thread-123/comments/comment-123/likes');

      // Assert
      expect(response.status).toEqual(401);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('Missing authentication');
    });

    it('should response 404 when thread not found', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-like-thread-not-found', username: 'dicoding-like-thread-not-found' });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-like-thread-not-found', username: 'dicoding-like-thread-not-found' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .put('/threads/thread-not-found/comments/comment-123/likes')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert
      expect(response.status).toEqual(404);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('thread tidak ditemukan');
    });

    it('should response 404 when comment not found', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-like-comment-not-found', username: 'dicoding-like-comment-not-found' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-like-comment-not-found', owner: 'user-like-comment-not-found' });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-like-comment-not-found', username: 'dicoding-like-comment-not-found' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .put('/threads/thread-like-comment-not-found/comments/comment-not-found/likes')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert
      expect(response.status).toEqual(404);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('komentar tidak ditemukan');
    });
  });

  describe('when POST /threads/:threadId/comments', () => {
    it('should response 201 and persisted comment', async () => {
      // Arrange
      const requestPayload = {
        content: 'sebuah comment',
      };
      await UsersTableTestHelper.addUser({ id: 'user-123', username: 'dicoding' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-123', owner: 'user-123' });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-123', username: 'dicoding' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .post('/threads/thread-123/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestPayload);

      // Assert
      expect(response.status).toEqual(201);
      expect(response.body.status).toEqual('success');
      expect(response.body.data.addedComment.id).toBeDefined();
      expect(response.body.data.addedComment.content).toEqual(requestPayload.content);
      expect(response.body.data.addedComment.owner).toEqual('user-123');

      const comments = await CommentsTableTestHelper.findCommentsById(response.body.data.addedComment.id);
      expect(comments).toHaveLength(1);
    });

    it('should response 401 when request without authentication', async () => {
      // Arrange
      const requestPayload = {
        content: 'sebuah comment',
      };
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .post('/threads/thread-123/comments')
        .send(requestPayload);

      // Assert
      expect(response.status).toEqual(401);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('Missing authentication');
    });

    it('should response 404 when thread not found', async () => {
      // Arrange
      const requestPayload = {
        content: 'sebuah comment',
      };
      await UsersTableTestHelper.addUser({ id: 'user-123', username: 'dicoding' });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-123', username: 'dicoding' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .post('/threads/thread-123/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestPayload);

      // Assert
      expect(response.status).toEqual(404);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('thread tidak ditemukan');
    });

    it('should response 400 when payload not contain needed property', async () => {
      // Arrange
      const requestPayload = {};
      await UsersTableTestHelper.addUser({ id: 'user-123', username: 'dicoding' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-123', owner: 'user-123' });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-123', username: 'dicoding' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .post('/threads/thread-123/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestPayload);

      // Assert
      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('tidak dapat membuat comment baru karena properti yang dibutuhkan tidak ada');
    });

    it('should response 400 when payload not meet data type specification', async () => {
      // Arrange
      const requestPayload = {
        content: true,
      };
      await UsersTableTestHelper.addUser({ id: 'user-123', username: 'dicoding' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-123', owner: 'user-123' });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-123', username: 'dicoding' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .post('/threads/thread-123/comments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestPayload);

      // Assert
      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('tidak dapat membuat comment baru karena tipe data tidak sesuai');
    });
  });

  describe('when POST /threads/:threadId/comments/:commentId/replies', () => {
    it('should response 201 and persisted reply', async () => {
      // Arrange
      const requestPayload = {
        content: 'sebuah balasan',
      };
      await UsersTableTestHelper.addUser({ id: 'user-reply-123', username: 'dicoding-reply' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-reply-123', owner: 'user-reply-123' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-reply-123',
        threadId: 'thread-reply-123',
        owner: 'user-reply-123',
      });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-reply-123', username: 'dicoding-reply' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .post('/threads/thread-reply-123/comments/comment-reply-123/replies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestPayload);

      // Assert
      expect(response.status).toEqual(201);
      expect(response.body.status).toEqual('success');
      expect(response.body.data.addedReply.id).toBeDefined();
      expect(response.body.data.addedReply.content).toEqual(requestPayload.content);
      expect(response.body.data.addedReply.owner).toEqual('user-reply-123');

      const replies = await RepliesTableTestHelper.findRepliesById(response.body.data.addedReply.id);
      expect(replies).toHaveLength(1);
    });

    it('should response 401 when request without authentication', async () => {
      // Arrange
      const requestPayload = {
        content: 'sebuah balasan',
      };
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .post('/threads/thread-123/comments/comment-123/replies')
        .send(requestPayload);

      // Assert
      expect(response.status).toEqual(401);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('Missing authentication');
    });

    it('should response 404 when thread not found', async () => {
      // Arrange
      const requestPayload = {
        content: 'sebuah balasan',
      };
      await UsersTableTestHelper.addUser({ id: 'user-reply-thread-not-found', username: 'dicoding-reply-thread-not-found' });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-reply-thread-not-found', username: 'dicoding-reply-thread-not-found' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .post('/threads/thread-not-found/comments/comment-123/replies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestPayload);

      // Assert
      expect(response.status).toEqual(404);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('thread tidak ditemukan');
    });

    it('should response 404 when comment not found', async () => {
      // Arrange
      const requestPayload = {
        content: 'sebuah balasan',
      };
      await UsersTableTestHelper.addUser({ id: 'user-reply-comment-not-found', username: 'dicoding-reply-comment-not-found' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-reply-comment-not-found', owner: 'user-reply-comment-not-found' });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-reply-comment-not-found', username: 'dicoding-reply-comment-not-found' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .post('/threads/thread-reply-comment-not-found/comments/comment-not-found/replies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestPayload);

      // Assert
      expect(response.status).toEqual(404);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('komentar tidak ditemukan');
    });

    it('should response 400 when payload not contain needed property', async () => {
      // Arrange
      const requestPayload = {};
      await UsersTableTestHelper.addUser({ id: 'user-reply-payload-missing', username: 'dicoding-reply-payload-missing' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-reply-payload-missing', owner: 'user-reply-payload-missing' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-reply-payload-missing',
        threadId: 'thread-reply-payload-missing',
        owner: 'user-reply-payload-missing',
      });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-reply-payload-missing', username: 'dicoding-reply-payload-missing' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .post('/threads/thread-reply-payload-missing/comments/comment-reply-payload-missing/replies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestPayload);

      // Assert
      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('tidak dapat membuat balasan baru karena properti yang dibutuhkan tidak ada');
    });

    it('should response 400 when payload not meet data type specification', async () => {
      // Arrange
      const requestPayload = {
        content: true,
      };
      await UsersTableTestHelper.addUser({ id: 'user-reply-payload-invalid', username: 'dicoding-reply-payload-invalid' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-reply-payload-invalid', owner: 'user-reply-payload-invalid' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-reply-payload-invalid',
        threadId: 'thread-reply-payload-invalid',
        owner: 'user-reply-payload-invalid',
      });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-reply-payload-invalid', username: 'dicoding-reply-payload-invalid' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .post('/threads/thread-reply-payload-invalid/comments/comment-reply-payload-invalid/replies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(requestPayload);

      // Assert
      expect(response.status).toEqual(400);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('tidak dapat membuat balasan baru karena tipe data tidak sesuai');
    });
  });

  describe('when DELETE /threads/:threadId/comments/:commentId/replies/:replyId', () => {
    it('should response 200 and soft delete reply', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-delete-reply-123', username: 'dicoding-delete-reply' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-delete-reply-123', owner: 'user-delete-reply-123' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-delete-reply-123',
        threadId: 'thread-delete-reply-123',
        owner: 'user-delete-reply-123',
      });
      await RepliesTableTestHelper.addReply({
        id: 'reply-delete-reply-123',
        commentId: 'comment-delete-reply-123',
        owner: 'user-delete-reply-123',
      });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-delete-reply-123', username: 'dicoding-delete-reply' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .delete('/threads/thread-delete-reply-123/comments/comment-delete-reply-123/replies/reply-delete-reply-123')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert
      expect(response.status).toEqual(200);
      expect(response.body.status).toEqual('success');

      const replies = await RepliesTableTestHelper.findRepliesById('reply-delete-reply-123');
      expect(replies).toHaveLength(1);
      expect(replies[0].is_delete).toEqual(true);
    });

    it('should response 401 when request without authentication', async () => {
      // Arrange
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .delete('/threads/thread-123/comments/comment-123/replies/reply-123');

      // Assert
      expect(response.status).toEqual(401);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('Missing authentication');
    });

    it('should response 404 when thread not found', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-delete-reply-thread-not-found', username: 'dicoding-delete-reply-thread-not-found' });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-delete-reply-thread-not-found', username: 'dicoding-delete-reply-thread-not-found' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .delete('/threads/thread-not-found/comments/comment-123/replies/reply-123')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert
      expect(response.status).toEqual(404);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('thread tidak ditemukan');
    });

    it('should response 404 when comment not found', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-delete-reply-comment-not-found', username: 'dicoding-delete-reply-comment-not-found' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-delete-reply-comment-not-found', owner: 'user-delete-reply-comment-not-found' });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-delete-reply-comment-not-found', username: 'dicoding-delete-reply-comment-not-found' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .delete('/threads/thread-delete-reply-comment-not-found/comments/comment-not-found/replies/reply-123')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert
      expect(response.status).toEqual(404);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('komentar tidak ditemukan');
    });

    it('should response 404 when reply not found', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-delete-reply-not-found', username: 'dicoding-delete-reply-not-found' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-delete-reply-not-found', owner: 'user-delete-reply-not-found' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-delete-reply-not-found',
        threadId: 'thread-delete-reply-not-found',
        owner: 'user-delete-reply-not-found',
      });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-delete-reply-not-found', username: 'dicoding-delete-reply-not-found' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .delete('/threads/thread-delete-reply-not-found/comments/comment-delete-reply-not-found/replies/reply-not-found')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert
      expect(response.status).toEqual(404);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('balasan tidak ditemukan');
    });

    it('should response 403 when deleting another user reply', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-delete-reply-owner-1', username: 'dicoding-delete-reply-owner-1' });
      await UsersTableTestHelper.addUser({ id: 'user-delete-reply-owner-2', username: 'dicoding-delete-reply-owner-2' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-delete-reply-owner', owner: 'user-delete-reply-owner-1' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-delete-reply-owner',
        threadId: 'thread-delete-reply-owner',
        owner: 'user-delete-reply-owner-1',
      });
      await RepliesTableTestHelper.addReply({
        id: 'reply-delete-reply-owner',
        commentId: 'comment-delete-reply-owner',
        owner: 'user-delete-reply-owner-1',
      });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-delete-reply-owner-2', username: 'dicoding-delete-reply-owner-2' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .delete('/threads/thread-delete-reply-owner/comments/comment-delete-reply-owner/replies/reply-delete-reply-owner')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert
      expect(response.status).toEqual(403);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('anda tidak berhak mengakses resource ini');
    });
  });

  describe('when DELETE /threads/:threadId/comments/:commentId', () => {
    it('should response 200 and soft delete comment', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-delete-comment-123', username: 'dicoding-delete-comment' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-delete-comment-123', owner: 'user-delete-comment-123' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-delete-comment-123',
        threadId: 'thread-delete-comment-123',
        owner: 'user-delete-comment-123',
      });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-delete-comment-123', username: 'dicoding-delete-comment' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .delete('/threads/thread-delete-comment-123/comments/comment-delete-comment-123')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert
      expect(response.status).toEqual(200);
      expect(response.body.status).toEqual('success');

      const comments = await CommentsTableTestHelper.findCommentsById('comment-delete-comment-123');
      expect(comments).toHaveLength(1);
      expect(comments[0].is_delete).toEqual(true);
    });

    it('should response 401 when request without authentication', async () => {
      // Arrange
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .delete('/threads/thread-123/comments/comment-123');

      // Assert
      expect(response.status).toEqual(401);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('Missing authentication');
    });

    it('should response 404 when thread not found', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-delete-thread-not-found', username: 'dicoding-delete-thread-not-found' });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-delete-thread-not-found', username: 'dicoding-delete-thread-not-found' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .delete('/threads/thread-not-found/comments/comment-123')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert
      expect(response.status).toEqual(404);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('thread tidak ditemukan');
    });

    it('should response 404 when comment not found', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-delete-comment-not-found', username: 'dicoding-delete-comment-not-found' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-delete-comment-not-found', owner: 'user-delete-comment-not-found' });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-delete-comment-not-found', username: 'dicoding-delete-comment-not-found' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .delete('/threads/thread-delete-comment-not-found/comments/comment-not-found')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert
      expect(response.status).toEqual(404);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('komentar tidak ditemukan');
    });

    it('should response 403 when deleting another user comment', async () => {
      // Arrange
      await UsersTableTestHelper.addUser({ id: 'user-delete-comment-owner-1', username: 'dicoding-delete-comment-owner-1' });
      await UsersTableTestHelper.addUser({ id: 'user-delete-comment-owner-2', username: 'dicoding-delete-comment-owner-2' });
      await ThreadsTableTestHelper.addThread({ id: 'thread-delete-comment-owner', owner: 'user-delete-comment-owner-1' });
      await CommentsTableTestHelper.addComment({
        id: 'comment-delete-comment-owner',
        threadId: 'thread-delete-comment-owner',
        owner: 'user-delete-comment-owner-1',
      });
      const accessToken = await container
        .getInstance(AuthenticationTokenManager.name)
        .createAccessToken({ id: 'user-delete-comment-owner-2', username: 'dicoding-delete-comment-owner-2' });
      const app = await createServer(container);

      // Action
      const response = await request(app)
        .delete('/threads/thread-delete-comment-owner/comments/comment-delete-comment-owner')
        .set('Authorization', `Bearer ${accessToken}`);

      // Assert
      expect(response.status).toEqual(403);
      expect(response.body.status).toEqual('fail');
      expect(response.body.message).toEqual('anda tidak berhak mengakses resource ini');
    });
  });

  it('should handle server error correctly', async () => {
    // Arrange
    const requestPayload = {
      username: 'dicoding',
      fullname: 'Dicoding Indonesia',
      password: 'super_secret',
    };
    const app = await createServer({});

    // Action
    const response = await request(app).post('/users').send(requestPayload);

    // Assert
    expect(response.status).toEqual(500);
    expect(response.body.status).toEqual('error');
    expect(response.body.message).toEqual('terjadi kegagalan pada server kami');
  });
});
