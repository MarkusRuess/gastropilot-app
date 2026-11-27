-- The public table is the canonical knowledge registry. Legacy lessons keep
-- their original evidence and point to a single canonical record.
alter table public.central_knowledge
  add column recorded_date date,
  add column proof_status text,
  add column data_classification text;

update public.central_knowledge
set recorded_date=(created_at at time zone 'Europe/Vienna')::date,
    proof_status=case when title in (
      'Zitierte E-Mail-Teile vom aktuellen Text trennen',
      'Einheiten nur innerhalb derselben Dimension umrechnen',
      'Geldbeträge mit Dezimalkomma einlesen'
    ) then 'synthetic_test' else 'source_reviewed' end,
    data_classification=case scope when 'shared' then 'generalized'
      when 'business' then 'business' else 'personal' end;

alter table public.central_knowledge
  alter column recorded_date set not null,
  alter column proof_status set not null,
  alter column data_classification set not null,
  add constraint central_knowledge_provenance_check check (
    nullif(btrim(source_reference),'') is not null
    and proof_status in ('unconfirmed','source_reviewed','synthetic_test','authenticated_live')
    and data_classification=case scope when 'shared' then 'generalized'
      when 'business' then 'business' else 'personal' end
  );

alter table enterprise_knowledge.lessons
  add column canonical_knowledge_id uuid references public.central_knowledge(id),
  add column project_key text,
  add column recorded_date date,
  add column proof_status text,
  add column data_classification text;

update enterprise_knowledge.lessons
set project_key=case
      when evidence like 'PROJEKTSTAND_FRIEDRICH%' then 'friedrich'
      when evidence like 'PROJEKTSTAND_JUDITH_AI%' then 'judith-ai'
      when evidence like 'PROJEKTSTAND_JUDITH%' then 'judith'
      when evidence like 'Genusswelt Baden%' then 'genusswelt'
      else 'gastropilot' end,
    recorded_date=(created_at at time zone 'Europe/Vienna')::date,
    proof_status=case when verified then 'synthetic_test' else 'unconfirmed' end,
    data_classification='generalized';

update enterprise_knowledge.lessons l
set canonical_knowledge_id=k.id
from public.central_knowledge k
where k.scope='shared' and (
  (l.rule='Currency parsing preserves decimal precision' and k.title='Geldbeträge mit Dezimalkomma einlesen')
  or (l.rule='Unit conversion rejects incompatible dimensions' and k.title='Einheiten nur innerhalb derselben Dimension umrechnen')
  or (l.rule='Quoted mail is separated from current message' and k.title='Zitierte E-Mail-Teile vom aktuellen Text trennen')
);

update public.central_knowledge k
set source_reference=k.source_reference || '; Legacy-Lernregel: ' || l.rule || '; ' || l.evidence
from enterprise_knowledge.lessons l
where l.canonical_knowledge_id=k.id
  and k.source_reference not like '%Legacy-Lernregel:%';

alter table enterprise_knowledge.lessons
  alter column project_key set not null,
  alter column recorded_date set not null,
  alter column proof_status set not null,
  alter column data_classification set not null,
  add constraint lessons_provenance_check check (
    nullif(btrim(evidence),'') is not null
    and project_key ~ '^[a-z0-9][a-z0-9_-]{1,79}$'
    and proof_status in ('unconfirmed','source_reviewed','synthetic_test','authenticated_live')
    and data_classification='generalized'
  );

create unique index lessons_one_alias_per_canonical
  on enterprise_knowledge.lessons(canonical_knowledge_id)
  where canonical_knowledge_id is not null;
