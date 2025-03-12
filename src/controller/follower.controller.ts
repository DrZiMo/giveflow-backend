import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { catchError } from "../../lib/catch.error";
import { AuthRequest } from "../../types/request.types";
import { resShort } from "../../lib/response";

const prisma = new PrismaClient()

// get user following pages
export const getFollowingPage = async (req: AuthRequest, res: Response) => {
    try {
        if(!req.userId) {
            resShort(res, 400, false, "No user ID provided")
            return
        }

        const pages = await prisma.follower.findMany({
            where: {user_id: req.userId}
        })

        if(!pages.length) {
            resShort(res, 404, false, "No following pages")
            return
        }

        res.status(200).json({
            ok: true,
            pages
        })
    } catch (error) {
        catchError(error, res)
    }
}

// toggle follow page
export const toggleFollowPage = async (req: AuthRequest, res: Response) => {
    try {
        if(!req.userId) {
            resShort(res, 400, false, "No user ID provided")
            return
        }

        const {giving_page_id} = req.params

        if(!giving_page_id) {
            resShort(res, 400, false, "Enter the giving page ID")
            return
        }

        const giving_page = await prisma.giving_page.findUnique({
            where: {id: giving_page_id}
        })

        if(!giving_page) {
            resShort(res, 404, false, "Giving page is not found")
            return
        }

        const isFollowing = await prisma.follower.findFirst({
            where: { user_id: req.userId, giving_page_id }
        })

        if(isFollowing) {
            await prisma.follower.delete({
                where: {id: isFollowing.id}
            })

            resShort(res, 200, true, "Unfollowed successfully")
            return
        } else {
            await prisma.follower.create({
                data: {
                    user_id: req.userId,
                    giving_page_id
                }
            })

            resShort(res, 200, true, "Followed successfully")
            return
        }
    } catch (error) {
        catchError(error, res)
    }
}