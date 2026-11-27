// Pure preflight: no network, no secrets, no side effects.
export function preflight({post,channel,delivery,now=Date.now()}) {
 if (!post?.business_id || post.business_id!==channel?.business_id || post.business_id!==delivery?.business_id || delivery.post_id!==post.id || delivery.channel_id!==channel.id) return 'tenant_mismatch';
 if (!['approved','scheduled'].includes(post.status) || !post.approved_by) return 'approval_required';
 if (post.original_media_url && !post.media_verified) return 'media_unverified';
 if (channel.status!=='connected' || channel.publish_authorized!==true) return 'authorization_required';
 if (delivery.state!=='queued') return 'reconcile_or_stop';
 if (post.status==='scheduled' && (!Number.isFinite(Date.parse(post.scheduled_at)) || Date.parse(post.scheduled_at)>now)) return 'not_due';
 return 'eligible_for_atomic_claim';
}
