SELECT CONCAT(table_schema, '.', table_name),
--        CONCAT(ROUND(table_rows / 1000000, 2), 'M')                                    rows,
       table_rows                                    rows,
       CONCAT(ROUND(data_length / ( 1024 * 1024 * 1024 ), 2), 'G')                    data,
       CONCAT(ROUND(index_length / ( 1024 * 1024 * 1024 ), 2), 'G')                   idx,
       CONCAT(ROUND(( data_length + index_length ) / ( 1024 * 1024 * 1024 ), 2), 'G') total_size,
       ROUND(index_length / data_length, 2)                                           idxfrac
FROM   information_schema.TABLES
WHERE table_schema = 'ccs.yes_empty_dev'
ORDER  BY table_rows DESC
LIMIT  500;
-- mysql ccs.yes_empty -uroot -p < ccs.ccs.yes_dev_23122019_1203.sql
