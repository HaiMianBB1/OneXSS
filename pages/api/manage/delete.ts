// 导入所需的模块
import { NextRequest } from "next/server";
import { verifyToken } from "../../../common/auth";

export const config = { runtime: "edge" };

export default async function handler(req: NextRequest) {
  try {
    if (req.method === "GET") {
      // 从请求中获取 JSON 数据
      const _cookie_token = req.cookies.get('token')?.value;
      const verifyResult = await verifyToken(_cookie_token);
      if (verifyResult.code !== 200) {
        return verifyResult.data;
      }
      const userid = verifyResult.data.userid;
      if (verifyResult.data.usertype !== 1) {
        return new Response(
            JSON.stringify({
                code: 403,
                message: "权限不足",
            }),
            {
                status: 403,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }

      const _userid = req.nextUrl.searchParams.get("userid");
      if (_userid == undefined) {
        return new Response(
          JSON.stringify({
            code: 400,
            message: "参数错误",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }
      const delete_userid = parseInt(_userid);
      if (userid == delete_userid) {
        return new Response(
          JSON.stringify({
            code: 400,
            message: "不能删除本用户",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }
      // 校验是否为管理员用户
      const usertypecheck = await process.env.DB.prepare("SELECT usertype FROM users WHERE userid = ?")
        .bind(delete_userid).first().then((query_result: any) => {
          return query_result.usertype
      });
      if(usertypecheck != 0){
        return new Response(
          JSON.stringify({
            code: 400,
            message: "不能删除管理员用户",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }
      
      const projecturl_results = await process.env.DB
        .prepare(
          "SELECT projecturl FROM projects WHERE userid=?"
        )
        .bind(delete_userid)
        .all().then((query_result: any) => {
          return query_result.results.map((row: any) => ({
            projecturl: row.projecturl,
          }));
        });
      const result = await process.env.DB
        .prepare(
          "DELETE FROM users WHERE userid=?"
        )
        .bind(delete_userid).run();
      await process.env.JSKV.delete(`token:${delete_userid}`);
      for (const projecturl_result of projecturl_results) {
        await process.env.JSKV.delete(`project:${projecturl_result.projecturl}`);
      }
      // 返回响应
      return new Response(
        JSON.stringify({
          code: 200,
          message: 'success',
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          code: 400,
          message: "接口错误",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

  } catch (e: any) {
    return new Response(
      JSON.stringify({
        code: 500,
        message: "服务器内部错误"
      }),
      {
        status: 500
      }
    );
  }
}
