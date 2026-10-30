
create table if not exists public.sales_invoices (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 invoice_number text not null, invoice_date date not null, service_date date not null,
 customer_name text not null, occasion text,
 gross_total numeric(12,2) not null default 0 check(gross_total>=0),
 net_total numeric(12,2) not null default 0 check(net_total>=0),
 vat_total numeric(12,2) not null default 0 check(vat_total>=0),
 delivery_status text not null default 'ready' check(delivery_status in ('ready','sent')),
 payment_status text not null default 'open' check(payment_status in ('open','paid')),
 pdf_name text, notes text, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(business_id,invoice_number), unique(id,business_id)
);
create table if not exists public.sales_invoice_items (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null, invoice_id uuid not null,
 line_no integer not null check(line_no>0), item_name text not null,
 article_group text not null check(article_group in ('Brötchen','Baguettes','Mehlspeisen','Catering & Boxen','Sonstiges')),
 quantity numeric(10,2) not null check(quantity>0),
 unit_price_gross numeric(12,4) not null check(unit_price_gross>=0),
 gross_amount numeric(12,2) not null check(gross_amount>=0),
 vat_rate numeric(5,2) not null default 10 check(vat_rate in (0,10,13,20)),
 net_amount numeric(12,2) not null check(net_amount>=0),
 vat_amount numeric(12,2) not null check(vat_amount>=0),
 unique(invoice_id,line_no),
 foreign key(invoice_id,business_id) references public.sales_invoices(id,business_id) on delete cascade
);
alter table public.sales_invoices enable row level security;
alter table public.sales_invoice_items enable row level security;
grant select,insert,update,delete on public.sales_invoices to authenticated;
grant select,insert,update,delete on public.sales_invoice_items to authenticated;
drop policy if exists sales_invoices_member_read on public.sales_invoices;
create policy sales_invoices_member_read on public.sales_invoices for select to authenticated using(private.is_business_member(business_id));
drop policy if exists sales_invoices_member_insert on public.sales_invoices;
create policy sales_invoices_member_insert on public.sales_invoices for insert to authenticated with check(private.is_business_member(business_id));
drop policy if exists sales_invoices_member_update on public.sales_invoices;
create policy sales_invoices_member_update on public.sales_invoices for update to authenticated using(private.is_business_member(business_id)) with check(private.is_business_member(business_id));
drop policy if exists sales_invoices_member_delete on public.sales_invoices;
create policy sales_invoices_member_delete on public.sales_invoices for delete to authenticated using(private.is_business_member(business_id));
drop policy if exists sales_invoice_items_member_read on public.sales_invoice_items;
create policy sales_invoice_items_member_read on public.sales_invoice_items for select to authenticated using(private.is_business_member(business_id));
drop policy if exists sales_invoice_items_member_insert on public.sales_invoice_items;
create policy sales_invoice_items_member_insert on public.sales_invoice_items for insert to authenticated with check(private.is_business_member(business_id));
drop policy if exists sales_invoice_items_member_update on public.sales_invoice_items;
create policy sales_invoice_items_member_update on public.sales_invoice_items for update to authenticated using(private.is_business_member(business_id)) with check(private.is_business_member(business_id));
drop policy if exists sales_invoice_items_member_delete on public.sales_invoice_items;
create policy sales_invoice_items_member_delete on public.sales_invoice_items for delete to authenticated using(private.is_business_member(business_id));

with b as(select id from public.businesses where name='Das Friedrich – Brot & Wasser RA GmbH' limit 1),
v as(select * from jsonb_to_recordset('[
{"invoice_number":"13-2026","invoice_date":"2026-10-30","service_date":"2026-10-03","customer_name":"Bestlist Immobilien GmbH","occasion":"Kundenevent","gross_total":63.50,"net_total":57.73,"vat_total":5.77,"pdf_name":"Rechnung_13-2026_Das_Friedrich.pdf"},
{"invoice_number":"14-2026","invoice_date":"2026-10-30","service_date":"2026-10-16","customer_name":"Antiquariat Kainbacher","occasion":"Kundenevent","gross_total":524.00,"net_total":476.36,"vat_total":47.64,"pdf_name":"Rechnung_14-2026_Das_Friedrich.pdf"},
{"invoice_number":"15-2026","invoice_date":"2026-10-30","service_date":"2026-10-22","customer_name":"Marktgemeinde Sooß","occasion":"Meeting","gross_total":151.80,"net_total":138.00,"vat_total":13.80,"pdf_name":"Rechnung_15-2026_Das_Friedrich.pdf"},
{"invoice_number":"16-2026","invoice_date":"2026-10-30","service_date":"2026-10-01","customer_name":"GG Tourismus der Stadtgemeinde Baden","gross_total":115.20,"net_total":104.73,"vat_total":10.47,"pdf_name":"Rechnung_16-2026_Das_Friedrich.pdf"},
{"invoice_number":"17-2026","invoice_date":"2026-10-30","service_date":"2026-11-05","customer_name":"GG Tourismus der Stadtgemeinde Baden","gross_total":115.20,"net_total":104.73,"vat_total":10.47,"pdf_name":"Rechnung_17-2026_Das_Friedrich.pdf"},
{"invoice_number":"18-2026","invoice_date":"2026-10-30","service_date":"2026-09-17","customer_name":"GG Tourismus der Stadtgemeinde Baden","gross_total":102.40,"net_total":93.09,"vat_total":9.31,"pdf_name":"Rechnung_18-2026_Das_Friedrich.pdf"}
]'::jsonb) as x(invoice_number text,invoice_date date,service_date date,customer_name text,occasion text,gross_total numeric,net_total numeric,vat_total numeric,pdf_name text))
insert into public.sales_invoices(business_id,invoice_number,invoice_date,service_date,customer_name,occasion,gross_total,net_total,vat_total,pdf_name)
select b.id,v.invoice_number,v.invoice_date,v.service_date,v.customer_name,v.occasion,v.gross_total,v.net_total,v.vat_total,v.pdf_name from b cross join v
on conflict(business_id,invoice_number) do nothing;

with b as(select id from public.businesses where name='Das Friedrich – Brot & Wasser RA GmbH' limit 1),
v as(select * from jsonb_to_recordset('[
{"invoice_number":"13-2026","line_no":1,"item_name":"Preiselbeerschnitten","article_group":"Mehlspeisen","quantity":4,"unit_price_gross":4.50},
{"invoice_number":"13-2026","line_no":2,"item_name":"Friedrich Box","article_group":"Catering & Boxen","quantity":1,"unit_price_gross":29.90},
{"invoice_number":"13-2026","line_no":3,"item_name":"Lachs-Baguette","article_group":"Baguettes","quantity":3,"unit_price_gross":5.20},
{"invoice_number":"14-2026","line_no":1,"item_name":"Hummus-Tomate Brötchen","article_group":"Brötchen","quantity":20,"unit_price_gross":3.20},
{"invoice_number":"14-2026","line_no":2,"item_name":"Ei-Aufstrich Brötchen","article_group":"Brötchen","quantity":10,"unit_price_gross":3.20},
{"invoice_number":"14-2026","line_no":3,"item_name":"Pilz-Trüffel Brötchen","article_group":"Brötchen","quantity":20,"unit_price_gross":3.20},
{"invoice_number":"14-2026","line_no":4,"item_name":"Schinken-Baguette","article_group":"Baguettes","quantity":20,"unit_price_gross":5.20},
{"invoice_number":"14-2026","line_no":5,"item_name":"Roastbeef-Baguette","article_group":"Baguettes","quantity":20,"unit_price_gross":5.20},
{"invoice_number":"14-2026","line_no":6,"item_name":"Lachs-Baguette","article_group":"Baguettes","quantity":30,"unit_price_gross":5.20},
{"invoice_number":"15-2026","line_no":1,"item_name":"Schinken-Baguette","article_group":"Baguettes","quantity":6,"unit_price_gross":4.50},
{"invoice_number":"15-2026","line_no":2,"item_name":"Roastbeef-Baguette","article_group":"Baguettes","quantity":6,"unit_price_gross":5.20},
{"invoice_number":"15-2026","line_no":3,"item_name":"Prosciutto-Baguette","article_group":"Baguettes","quantity":6,"unit_price_gross":5.20},
{"invoice_number":"15-2026","line_no":4,"item_name":"Camembert-Baguette","article_group":"Baguettes","quantity":3,"unit_price_gross":5.20},
{"invoice_number":"15-2026","line_no":5,"item_name":"Mozzarella-Baguette","article_group":"Baguettes","quantity":3,"unit_price_gross":5.20},
{"invoice_number":"15-2026","line_no":6,"item_name":"Lachs-Baguette","article_group":"Baguettes","quantity":6,"unit_price_gross":5.20},
{"invoice_number":"16-2026","line_no":1,"item_name":"Gemischte Brötchen","article_group":"Brötchen","quantity":36,"unit_price_gross":3.20},
{"invoice_number":"17-2026","line_no":1,"item_name":"Gemischte Brötchen","article_group":"Brötchen","quantity":36,"unit_price_gross":3.20},
{"invoice_number":"18-2026","line_no":1,"item_name":"Gemischte Brötchen","article_group":"Brötchen","quantity":32,"unit_price_gross":3.20}
]'::jsonb) as x(invoice_number text,line_no int,item_name text,article_group text,quantity numeric,unit_price_gross numeric)),
t as(select i.id invoice_id,b.id business_id,i.invoice_number from public.sales_invoices i join b on b.id=i.business_id)
insert into public.sales_invoice_items(business_id,invoice_id,line_no,item_name,article_group,quantity,unit_price_gross,gross_amount,vat_rate,net_amount,vat_amount)
select t.business_id,t.invoice_id,v.line_no,v.item_name,v.article_group,v.quantity,v.unit_price_gross,round(v.quantity*v.unit_price_gross,2),10,round(round(v.quantity*v.unit_price_gross,2)/1.10,2),round(v.quantity*v.unit_price_gross,2)-round(round(v.quantity*v.unit_price_gross,2)/1.10,2)
from v join t using(invoice_number) on conflict(invoice_id,line_no) do nothing;
