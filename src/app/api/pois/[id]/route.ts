import { NextResponse } from "next/server";
import { auth } from "@/composition/auth";
import { poiService } from "@/composition/poi";
import { userId } from "@/repositories/auth/auth-identifiers";
import { poiId } from "@/repositories/poi/poi-repository";

export const dynamic = "force-dynamic";

export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth.api.getSession({ headers: req.headers });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id: rawId } = await params;
	const id = Number.parseInt(rawId, 10);
	if (!Number.isInteger(id) || id <= 0) {
		return NextResponse.json(
			{ error: "`id` must be a positive integer" },
			{ status: 400 },
		);
	}

	const deleted = await poiService.delete(poiId(id), userId(session.user.id));
	if (!deleted) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	return new NextResponse(null, { status: 204 });
}
