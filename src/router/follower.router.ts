import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { getFollowingPage, toggleFollowPage } from "../controller/follower.controller";

const router = Router()

router.get('/following', authenticate, getFollowingPage)
router.post('/:giving_page_id', authenticate, toggleFollowPage)

export default router