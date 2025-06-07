import { auth, provider } from "../firebaseInit";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

import { useState, useRef, useEffect } from "react";
import styles from "./TaskManager.module.css";
import { db } from "../firebaseInit";
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

export default function TaskManager() {
  //State variables
  const [updateIndex, setUpdateIndex] = useState(null);
  const [willUpdate, setWillUpdate] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [user, setUser] = useState(null);
  const [showSignInBox, setShowSignInBox] = useState(false);

  let [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    tag: "work",
    title: "",
    description: "",
    duration: {
      hour: 0,
      minute: 0,
    },
  });
  const [taskArray, setTaskArray] = useState([]);

  //useRef
  const inputRef = useRef(null);
  //useEffect
  useEffect(() => {
    inputRef.current.focus();
  }, []);
  //showing all the data from database on mount
  //Real-time data
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      console.log(snapshot); //QuerySnapshot
      const taskArray = snapshot.docs.map((doc) => ({
        //doc is QueryDocumentSnapshot
        id: doc.id,
        ...doc.data(),
      }));
      console.log(taskArray); //taskArray is array of objects
      setTaskArray(taskArray);
    });

    return () => unsubscribe(); // clean up on unmount
  }, []);

  //Validate Form
  function validateForm(formData) {
    if (!formData.title.trim()) return "No title added";
    if (!formData.description.trim()) return "No description added";
    if (
      parseInt(formData.duration.hour) === 0 &&
      parseInt(formData.duration.minute) === 0
    )
      return "No duration added";
    return null;
  }
  //Detect AuthState on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  //create reusable login function
  const promptSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Sign-in failed", err);
    }
  };

  //Function submit the form
  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) {
      setShowSignInBox(true);
      return;
    }
    setWillUpdate(false);

    const error = validateForm(formData);
    if (error) {
      setAlertMessage(error);
      setTimeout(() => setAlertMessage(""), 2000);
      return;
    }
    if (willUpdate && updateIndex !== null) {
      const id = taskArray[updateIndex].id;
      await updateDoc(doc(db, "tasks", id), formData);
      setUpdateIndex(null);
    } else {
      const docRef = await addDoc(collection(db, "tasks"), formData);
      console.log("Document written with ID: ", docRef.id);
    }

    setWillUpdate(false);

    setFormData({
      date: new Date().toISOString().split("T")[0],
      tag: "work",
      title: "",
      description: "",
      duration: {
        hour: 0,
        minute: 0,
      },
    });
  }
  //Function to delete task
  async function handleDelete(index) {
    if (!user) {
      setShowSignInBox(true);
      return;
    }
    const taskId = taskArray[index].id; // get the Firestore document ID
    await deleteDoc(doc(db, "tasks", taskId));
  }

  //Function to update task
  async function handleUpdate(index) {
    if (!user) {
      setShowSignInBox(true);
      return;
    }
    const task = taskArray[index];
    setFormData({ ...task }); //to prefil the input fields

    setUpdateIndex(index);
    setWillUpdate(true);
  }

  return (
    <>
      {/* Today's date */}
      <p className={styles.todayDate}>Today is: {new Date().toDateString()}</p>
      {/* Sign in wih google button */}
      {!user && showSignInBox && (
        <div className={styles.signInBox}>
          <h2>Please sign in to continue</h2>
          <button
            onClick={() => {
              promptSignIn();
              setShowSignInBox(false);
            }}
          >
            Sign in with Google
          </button>
        </div>
      )}
      {/* Sign-out button */}
      {user && (
        <div className={styles.userInfo}>
          <p>Signed in as: {user.displayName}</p>
          <button onClick={() => signOut(auth)} className={styles.signOutBtn}>
            Sign Out
          </button>
        </div>
      )}

      {/* For alert message */}
      {alertMessage && <div className={styles.alert}>{alertMessage}</div>}

      {/* Form to add task */}
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2>Plan your day</h2>
        {/* For the day */}
        <div className={styles.date}>
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) => {
              setFormData({ ...formData, date: e.target.value });
            }}
          />
        </div>
        {/* For the date selection */}
        <div className={styles.tags}>
          {/* select Tag */}
          <label>Tag</label>
          <br />
          <input
            type="radio"
            id="work"
            name="tag"
            value="work"
            //This is a controlled input in React.
            // If formData.tag is "work", then this radio button will appear selected.
            checked={formData.tag === "work"}
            onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
            defaultChecked
          />
          <label htmlFor="work">Work</label>
          <input
            type="radio"
            id="home"
            name="tag"
            value="home"
            checked={formData.tag === "home"}
            onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
          />
          <label htmlFor="home">Home</label>
          <input
            type="radio"
            id="urgent"
            name="tag"
            value="urgent"
            checked={formData.tag === "urgent"}
            onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
          />
          <label htmlFor="urgent">Urgent</label>
        </div>
        {/* Type Title of the task */}
        <div className={styles.title}>
          <label htmlFor="title">Title</label>
          <input
            type="text"
            placeholder="Title of the task..."
            id="title"
            ref={inputRef}
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
          />
        </div>
        {/* Add Description of the task */}
        <div className={styles.description}>
          <label htmlFor="desc">Description</label>
          <textarea
            id="desc"
            name="description"
            rows="5"
            cols="20"
            placeholder="Enter your task description here..."
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          ></textarea>
        </div>
        {/* For Duration */}
        <div className={styles.duration}>
          <label htmlFor="hour">Duration</label>
          {/* For hour */}
          <div className={styles.hour}>
            <select
              id="hour"
              name="hour"
              value={formData.duration.hour}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  duration: { ...formData.duration, hour: e.target.value },
                });
              }}
            >
              <option value="">Select hour</option>
              {Array.from({ length: 23 }, (_, i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            &nbsp;
            <label>hour</label>
          </div>
          {/* For Minute */}
          <div className={styles.minute}>
            <select
              id="minute"
              name="minute"
              value={formData.duration.minute}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  duration: { ...formData.duration, minute: e.target.value },
                });
              }}
            >
              <option value={0}>0</option>
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={45}>45</option>
            </select>
            &nbsp;
            <label>minute</label>
          </div>
        </div>
        {/* Button */}
        <div className={styles.btnDiv}>
          <button className={styles.button}>
            {willUpdate ? "Update Task" : "Add Task"}
          </button>
        </div>
      </form>
      {/* The Task List */}

      {taskArray
        .sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();

          if (dateA < dateB) return -1; // latest date first
          if (dateA > dateB) return 1;

          // If dates are same, compare hour
          const hourA = parseInt(a.duration.hour);
          const hourB = parseInt(b.duration.hour);

          if (hourA !== hourB) return hourA - hourB;

          // If hours are same, compare minute
          const minuteA = parseInt(a.duration.minute);
          const minuteB = parseInt(b.duration.minute);

          return minuteA - minuteB;
        })
        .map((task, index) => (
          <div className={styles.taskContainer} key={index}>
            <div className={styles.tagContainer}>
              <div>
                <div className={styles.tagDiv}>
                  <span className="material-symbols-outlined">
                    label_important
                  </span>
                  <span className={styles.tag}>{task.tag}</span>
                </div>
                <h3>{task.title}</h3>
                <h4>{task.description}</h4>
              </div>

              <div>
                <h4 style={{ color: "black" }}>Date: {task.date}</h4>
                {task.duration.hour > 0 && task.duration.minute > 0 && (
                  <span>Deadline :</span>
                )}
                &nbsp;
                {task.duration.hour > 0 && (
                  <span>{task.duration.hour} hour</span>
                )}
                {task.duration.minute > 0 && (
                  <span>{task.duration.minute} minute</span>
                )}
              </div>
            </div>
            <div className={styles.icons}>
              <span
                className="material-symbols-outlined"
                onClick={() => handleDelete(index)}
              >
                delete
              </span>
              <span
                className="material-symbols-outlined"
                onClick={() => handleUpdate(index)}
              >
                edit_note
              </span>
            </div>
          </div>
        ))}
    </>
  );
}
