import express from 'express';

const createThreadsRouter = (handler) => {
  const router = express.Router();

  router.get('/:threadId', handler.getThreadByIdHandler);
  router.post('/', handler.postThreadHandler);
  router.post('/:threadId/comments', handler.postCommentHandler);
  router.post('/:threadId/comments/:commentId/replies', handler.postReplyHandler);
  router.delete('/:threadId/comments/:commentId', handler.deleteCommentHandler);
  router.delete('/:threadId/comments/:commentId/replies/:replyId', handler.deleteReplyHandler);

  return router;
};

export default createThreadsRouter;