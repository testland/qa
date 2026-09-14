package pool

import (
	"database/sql"
	"database/sql/driver"
)

type stubDriver struct{}
type stubConn struct{}

func (stubDriver) Open(string) (driver.Conn, error)  { return stubConn{}, nil }
func (stubConn) Prepare(string) (driver.Stmt, error) { return nil, driver.ErrSkip }
func (stubConn) Close() error                        { return nil }
func (stubConn) Begin() (driver.Tx, error)           { return nil, driver.ErrSkip }

func init() { sql.Register("stub", stubDriver{}) }

// One handle for the whole package, opened once and never closed - the real
// service holds its pool for the life of the process too.
var testDB = mustOpen()

func mustOpen() *sql.DB {
	db, err := sql.Open("stub", "")
	if err != nil {
		panic(err)
	}
	return db
}
