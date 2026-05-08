-- Reverses 001_initial_schema. Drops tables in reverse dependency order, then types.

set search_path = public;

drop view if exists eligible_units;
drop view if exists account_credit_balance;

drop trigger if exists return_requests_updated_at on return_requests;
drop function if exists set_updated_at();

drop table if exists discount_codes;
drop table if exists credit_transfers;
drop table if exists store_credit_ledger;
drop table if exists trade_in_credits;
drop table if exists donation_records;
drop table if exists refurb_listings;
drop table if exists ngo_partners;
drop table if exists assessment_photos;
drop table if exists condition_assessments;
drop table if exists return_request_events;
drop table if exists return_requests;
drop table if exists owned_units;
drop table if exists order_line_items;
drop table if exists orders;
drop table if exists product_images;
drop table if exists products;
drop table if exists child_profiles;
drop table if exists accounts;

drop type if exists credit_source_type;
drop type if exists assessment_phase;
drop type if exists condition_grade;
drop type if exists return_status;
drop type if exists return_path;
drop type if exists owned_unit_status;
