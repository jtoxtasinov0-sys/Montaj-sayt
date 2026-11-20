import { and, asc, eq } from "drizzle-orm";
import { CalendarClock, ExternalLink, Lock, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  acceptProposal,
  cancelOrder,
  completeOrder,
  deliverOrder,
  requestRevision,
  respondToOrder,
  sendProposal,
  submitReview,
} from "@/actions/orders";
import { Avatar } from "@/components/avatar";
import { ActionForm, SubmitButton } from "@/components/form";
import { TelegramIcon } from "@/components/icons";
import { Field, StatusBadge } from "@/components/page-bits";
import { RatingStars } from "@/components/rating-stars";
import { db } from "@/db";
import { editorProfiles, orders, proposals, reviews, users } from "@/db/schema";
import { getCurrentUser, getEditorProfileByUser } from "@/lib/auth/current";
import { fmt, getDict, getLocale, type Dict } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function loadOrder(id: string) {
  const rows = await db
    .select({ o: orders, clientName: users.name, clientTelegram: users.telegram, clientImage: users.image })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.clientId))
    .where(eq(orders.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [row, me, d, locale] = await Promise.all([loadOrder(id), getCurrentUser(), getDict(), getLocale()]);
  if (!row) notFound();
  const o = row.o;
  const myEditor = me ? await getEditorProfileByUser(me.id) : null;

  const isClient = me?.id === o.clientId;
  const isEditor = !!myEditor && myEditor.id === o.editorId;
  const isAdmin = me?.role === "ADMIN";
  const isPublicView = o.status === "OPEN" && o.isPublic;
  if (!isClient && !isEditor && !isAdmin && !isPublicView) notFound();

  const [editor, review, proposalList, myProposal] = await Promise.all([
    o.editorId
      ? db
          .select({ p: editorProfiles, image: users.image })
          .from(editorProfiles)
          .innerJoin(users, eq(users.id, editorProfiles.userId))
          .where(eq(editorProfiles.id, o.editorId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : null,
    o.status === "COMPLETED" ? db.select().from(reviews).where(eq(reviews.orderId, o.id)).limit(1).then((r) => r[0] ?? null) : null,
    (isClient || isAdmin) && o.status === "OPEN"
      ? db
          .select({ pr: proposals, ed: editorProfiles, image: users.image })
          .from(proposals)
          .innerJoin(editorProfiles, eq(editorProfiles.id, proposals.editorId))
          .innerJoin(users, eq(users.id, editorProfiles.userId))
          .where(eq(proposals.orderId, o.id))
          .orderBy(asc(proposals.createdAt))
      : [],
    myEditor && !isClient
      ? db
          .select()
          .from(proposals)
          .where(and(eq(proposals.orderId, o.id), eq(proposals.editorId, myEditor.id)))
          .limit(1)
          .then((r) => r[0] ?? null)
      : null,
  ]);

  const price = o.agreedPriceUsd ?? o.budgetUsd;

  return (
    <>
      <section className="border-b border-line">
        <div className="container-x pt-32 pb-12">
          <div className="fade-up flex flex-wrap items-center gap-2">
            <StatusBadge status={o.status} label={d.orderStatus[o.status]} />
            <span className="chip">{d.categories[o.category] ?? o.category}</span>
            {!o.isPublic && (
              <span className="chip">
                <Lock className="h-3 w-3" /> {d.order.privateNotice}
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h1 className="h-hero fade-up max-w-3xl text-[clamp(2rem,4.5vw,3.6rem)]">{o.title}</h1>
            <div className="fade-up shrink-0 text-left md:text-right">
              <div className="text-5xl font-extralight tracking-tighter">${price}</div>
              <div className="text-sm text-muted">{o.agreedPriceUsd ? d.order.agreedPrice : d.jobs.budget}</div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" /> {d.order.deadline}: {formatDate(o.deadline, locale)}
            </span>
            <span>
              {d.jobs.posted}: {formatDate(o.createdAt, locale)}
            </span>
            {o.revisionCount > 0 && <span>{fmt(d.order.revisions, { n: o.revisionCount })}</span>}
          </div>
        </div>
      </section>

      <div className="container-x mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <div className="card p-6">
            <p className="leading-relaxed whitespace-pre-line text-muted">{o.description}</p>
          </div>

          {o.revisionNote && o.status === "IN_PROGRESS" && (isClient || isEditor) && (
            <div className="card border-accent/40 p-5">
              <p className="text-sm font-medium text-accent">{d.order.revisionRequested}</p>
              <p className="mt-2 text-sm whitespace-pre-line text-muted">{o.revisionNote}</p>
            </div>
          )}

          {o.deliveryUrl && (isClient || isEditor || isAdmin) && (
            <div className="card p-5">
              <p className="text-sm font-medium">{d.order.result}</p>
              <a href={o.deliveryUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-ghost btn-sm mt-3">
                <ExternalLink className="h-4 w-4" /> {d.order.openResult}
              </a>
              {o.deliveryNote && <p className="mt-3 text-sm whitespace-pre-line text-muted">{o.deliveryNote}</p>}
            </div>
          )}

          {/* ---- Mijoz amallari ---- */}
          {isClient && o.status === "OPEN" && (
            <section className="space-y-3">
              <h2 className="h-section text-2xl">
                {d.order.proposalsTitle} <span className="text-muted">({proposalList.length})</span>
              </h2>
              {proposalList.length === 0 && <div className="card p-6 text-sm text-muted">{d.order.noProposals}</div>}
              {proposalList.map(({ pr, ed, image }) => (
                <div key={pr.id} className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={`/editors/${ed.slug}`} className="flex items-center gap-3 hover:underline hover:underline-offset-4">
                      <Avatar name={ed.displayName} avatarKey={ed.avatarKey} image={image} size={44} />
                      <div>
                        <p className="font-medium">{ed.displayName}</p>
                        <p className="flex items-center gap-1.5 text-xs text-muted">
                          {d.levels[ed.level]}
                          {ed.ratingCount > 0 && (
                            <>
                              · <Star className="h-3 w-3 fill-accent text-accent" /> {ed.ratingAvg.toFixed(1)} ({ed.ratingCount})
                            </>
                          )}
                          · {fmt(d.editors.jobsDone, { n: ed.completedOrders })}
                        </p>
                      </div>
                    </Link>
                    <div className="text-right">
                      <div className="text-2xl font-light">${pr.priceUsd}</div>
                      <div className="text-xs text-muted">{fmt(d.profile.delivery, { n: pr.days })}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm whitespace-pre-line text-muted">{pr.message}</p>
                  {pr.status === "PENDING" && (
                    <ActionForm action={acceptProposal.bind(null, pr.id)} className="mt-4">
                      <SubmitButton size="sm">{d.order.acceptProposal}</SubmitButton>
                    </ActionForm>
                  )}
                </div>
              ))}
            </section>
          )}

          {isClient && o.status === "DELIVERED" && (
            <div className="grid gap-4 md:grid-cols-2">
              <ActionForm action={completeOrder.bind(null, o.id)} className="card flex flex-col justify-between gap-4 p-5">
                <p className="text-sm text-muted">{d.orderStatus.DELIVERED}</p>
                <SubmitButton>{d.order.complete}</SubmitButton>
              </ActionForm>
              <ActionForm action={requestRevision.bind(null, o.id)} className="card space-y-3 p-5">
                <p className="text-sm font-medium">{d.order.revisionTitle}</p>
                <textarea name="revisionNote" required minLength={3} maxLength={1000} rows={3} placeholder={d.order.revisionNote} className="input" />
                <SubmitButton variant="ghost">{d.order.requestRevision}</SubmitButton>
              </ActionForm>
            </div>
          )}

          {isClient && o.status === "COMPLETED" && !review && <ReviewForm orderId={o.id} d={d} />}
          {review && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="font-medium">{d.order.reviewTitle}</p>
                <RatingStars value={review.rating} />
              </div>
              <p className="mt-2 text-xs text-muted">
                {d.order.quality}: {review.quality}/5 · {d.order.communication}: {review.communication}/5 ·{" "}
                {review.onTime ? d.order.onTime : d.order.late}
              </p>
              {review.comment && <p className="mt-3 text-sm text-muted">{review.comment}</p>}
            </div>
          )}

          {/* ---- Montajor amallari ---- */}
          {isEditor && o.status === "PENDING" && (
            <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
              <p className="text-sm text-muted">{d.orderStatus.PENDING}</p>
              <div className="flex gap-2">
                <ActionForm action={respondToOrder.bind(null, o.id, true)}>
                  <SubmitButton>{d.order.accept}</SubmitButton>
                </ActionForm>
                <ActionForm action={respondToOrder.bind(null, o.id, false)}>
                  <SubmitButton variant="ghost">{d.order.decline}</SubmitButton>
                </ActionForm>
              </div>
            </div>
          )}

          {isEditor && o.status === "IN_PROGRESS" && (
            <ActionForm action={deliverOrder.bind(null, o.id)} className="card space-y-4 p-6">
              <h2 className="text-lg font-medium">{d.order.deliverTitle}</h2>
              <Field label={d.order.deliveryUrl}>
                <input name="deliveryUrl" type="url" required placeholder={d.order.deliveryUrlPh} pattern="https://.*" className="input" />
              </Field>
              <Field label={`${d.order.deliveryNote} (${d.common.optional})`}>
                <textarea name="deliveryNote" maxLength={1000} rows={3} className="input" />
              </Field>
              <SubmitButton>{d.order.deliver}</SubmitButton>
            </ActionForm>
          )}

          {/* ---- Taklif yuborish (ochiq buyurtma) ---- */}
          {o.status === "OPEN" && o.isPublic && !isClient && (
            <section className="card p-6">
              <h2 className="text-lg font-medium">{myProposal ? d.order.yourProposal : d.order.proposeTitle}</h2>
              {!me ? (
                <Link href={`/login?next=/orders/${o.id}`} className="btn btn-primary mt-4">
                  {d.order.loginToPropose}
                </Link>
              ) : !myEditor ? (
                <Link href="/dashboard/profile" className="btn btn-primary mt-4">
                  {d.order.becomeEditorToPropose}
                </Link>
              ) : (
                <ActionForm action={sendProposal.bind(null, o.id)} className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={d.order.proposalPrice}>
                      <input name="priceUsd" type="number" min={5} max={10000} required defaultValue={myProposal?.priceUsd ?? o.budgetUsd} className="input" />
                    </Field>
                    <Field label={d.order.proposalDays}>
                      <input name="days" type="number" min={1} max={90} required defaultValue={myProposal?.days ?? 3} className="input" />
                    </Field>
                  </div>
                  <Field label={d.order.proposalMessage}>
                    <textarea
                      name="message"
                      required
                      minLength={10}
                      maxLength={2000}
                      rows={4}
                      defaultValue={myProposal?.message}
                      placeholder={d.order.proposalMessagePh}
                      className="input"
                    />
                  </Field>
                  <SubmitButton>{d.order.sendProposal}</SubmitButton>
                </ActionForm>
              )}
            </section>
          )}
        </div>

        {/* ---- Yon panel ---- */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card space-y-4 p-5">
            <p className="text-xs tracking-wide text-muted uppercase">{d.order.contacts}</p>
            <div className="flex items-center gap-3">
              <Avatar name={row.clientName} image={row.clientImage} size={40} />
              <div className="min-w-0">
                <p className="text-xs text-muted">{d.order.client}</p>
                <p className="truncate font-medium">{row.clientName}</p>
              </div>
              {isEditor && row.clientTelegram && (
                <a href={`https://t.me/${row.clientTelegram}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm ml-auto">
                  <TelegramIcon className="h-4 w-4" />
                </a>
              )}
            </div>
            {editor && (
              <div className="flex items-center gap-3 border-t border-line pt-4">
                <Avatar name={editor.p.displayName} avatarKey={editor.p.avatarKey} image={editor.image} size={40} />
                <div className="min-w-0">
                  <p className="text-xs text-muted">{d.order.editor}</p>
                  <Link href={`/editors/${editor.p.slug}`} className="truncate font-medium hover:underline hover:underline-offset-4">
                    {editor.p.displayName}
                  </Link>
                </div>
                {(isClient || isAdmin) && editor.p.telegram && (
                  <a href={`https://t.me/${editor.p.telegram}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm ml-auto">
                    <TelegramIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {isClient && (o.status === "OPEN" || o.status === "PENDING") && (
            <ActionForm action={cancelOrder.bind(null, o.id)} confirmText={`${d.order.cancel}?`}>
              <SubmitButton variant="ghost" className="w-full text-danger">
                {d.order.cancel}
              </SubmitButton>
            </ActionForm>
          )}
          {o.status === "CANCELLED" && o.cancelReason === "declined" && (
            <p className="card p-4 text-sm text-muted">{d.order.declinedReason}</p>
          )}
        </aside>
      </div>
    </>
  );
}

function ReviewForm({ orderId, d }: { orderId: string; d: Dict }) {
  const Stars5 = ({ name }: { name: string }) => (
    <div className="flex flex-wrap gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="check">
          <input type="radio" name={name} value={n} required defaultChecked={n === 5} className="sr-only" />
          {n} <Star className="h-3.5 w-3.5 fill-accent text-accent" />
        </label>
      ))}
    </div>
  );
  return (
    <ActionForm action={submitReview.bind(null, orderId)} className="card space-y-5 p-6">
      <h2 className="text-lg font-medium">{d.order.reviewTitle}</h2>
      <Field label={d.order.quality}>
        <Stars5 name="quality" />
      </Field>
      <Field label={d.order.communication}>
        <Stars5 name="communication" />
      </Field>
      <Field label={`${d.order.comment} (${d.common.optional})`}>
        <textarea name="comment" maxLength={1000} rows={3} placeholder={d.order.commentPh} className="input" />
      </Field>
      <SubmitButton>{d.order.sendReview}</SubmitButton>
    </ActionForm>
  );
}
